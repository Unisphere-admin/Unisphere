import { NextRequest, NextResponse } from 'next/server';
import { getConversationById, sendMessage, Message, deleteMessage } from '@/lib/db/messages';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Export runtime config for improved performance
export const runtime = 'edge';

// Cache recent responses to reduce database load
const responseCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 900000; // 15 minutes TTL for cache (was 10 seconds)

// Helper to get cached responses or fetch new ones
const getCachedOrFresh = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  
  // Use cache if available and not expired
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data as T;
  }
  
  // Otherwise fetch fresh data
  const result = await fetchFn();
  
  // Cache the new result
  responseCache.set(cacheKey, {
    data: result,
    timestamp: now
  });
  
  return result;
};

interface TransformedMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  conversation_id: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
}

// GET handler for messages
async function getMessagesHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');
    // Add support for pagination to improve performance with large message history
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const before = searchParams.get('before') || undefined;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    console.log(`Getting messages for conversation: ${conversationId}, user: ${user.id}`);

    // Start a performance timer
    const startTime = performance.now();

    // Create a cache key based on request parameters
    const cacheKey = `messages:${conversationId}:${limit}:${before || 'latest'}`;

    // Get the data from cache or fresh from database
    const result = await getCachedOrFresh(cacheKey, async () => {
      try {
        // Use the data access layer to get conversation and messages
        const { conversation, messages, error } = await getConversationById(user, conversationId);
        
        if (error) {
          console.error(`Error fetching conversation data: ${error}`);
          return { conversation, messages: [], error };
        }
        
        if (!conversation) {
          console.error(`No conversation found with ID: ${conversationId}`);
          return { conversation, messages: [], error: "Conversation not found" };
        }
        
        // Create a map of participants by user_id for faster lookups
        const participantsMap: Record<string, any> = {};
        conversation.participants?.forEach(participant => {
          if (!participant.user_id) {
            console.warn(`Participant without user_id found in conversation ${conversationId}`);
            return;
          }
          participantsMap[participant.user_id] = participant;
        });
        
        // Transform messages to include sender display names
        const transformedMessages: TransformedMessage[] = messages.map(message => {
          const participant = participantsMap[message.sender_id];
          
          // Get display name from the user's profile data
          let displayName = 'Unknown User';
          let avatarUrl = null;
          let isTutor = false;
          
          if (participant?.user) {
            const userData = participant.user as any;
            displayName = userData.display_name || userData.email || 'Unknown User';
            avatarUrl = userData.avatar_url || null;
            isTutor = userData.is_tutor || false;
          }
          
          return {
            ...message,
            sender: {
              id: message.sender_id,
              display_name: displayName,
              avatar_url: avatarUrl,
              is_tutor: isTutor
            }
          };
        });
        
        return { 
          conversation, 
          transformedMessages, 
          error
        };
      } catch (innerError) {
        console.error("Error in message processing:", innerError);
        const errorDetails = innerError instanceof Error 
          ? innerError.message + (innerError.stack ? '\n' + innerError.stack : '') 
          : JSON.stringify(innerError);
        console.error(`Detailed error: ${errorDetails}`);
        
        return {
          conversation: null,
          transformedMessages: [],
          error: "Failed to process messages"
        };
      }
    });
    
    // Handle errors
    if (result.error) {
      console.error(`Error returning messages: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (!result.conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user is a participant
    const isParticipant = result.conversation.participants?.some(p => p.user_id === user.id);
    
    // Allow premium users or tutors to access any conversation even if not a participant
    if (!isParticipant && !(user.is_tutor || user.has_access)) {
      return NextResponse.json({ error: 'Not authorized to access this conversation' }, { status: 403 });
    }

    // End the performance timer
    const endTime = performance.now();
    const processingTime = Math.round(endTime - startTime);
    
    console.log(`Successfully fetched ${result.transformedMessages?.length || 0} messages in ${processingTime}ms`);
    
    return NextResponse.json({ 
      messages: result.transformedMessages, 
      has_more: false, // The DAL doesn't currently support pagination
      processing_time_ms: processingTime
    });
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    console.error(`Unhandled error in getMessagesHandler: ${errorDetails}`);
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined 
    }, { status: 500 });
  }
}

// Helper function to trigger a Supabase broadcast for new messages
const broadcastMessage = async (message: Message, conversationId: string) => {
  try {
    // Use createRouteHandlerClientWithCookies to properly await cookies
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Use the same channel name format as in RealtimeContext
    const channelName = `tutoring_session:conversation:${conversationId}`;
    const channel = supabase.channel(channelName);
    
    // Subscribe to the channel before sending
    await channel.subscribe();
    
    // Send the message broadcast
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: message
    });
    
    console.log(`Broadcasted message update for conversation ${conversationId}`);
  } catch (error) {
    console.error("Error broadcasting message:", error);
    // Silently handle error - don't break API response for broadcast failures
  }
};

// POST handler for messages
async function postMessagesHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { conversation_id, content } = body;

    if (!conversation_id || !content) {
      return NextResponse.json({ error: 'Conversation ID and content are required' }, { status: 400 });
    }

    // Invalidate the messages cache for this conversation
    // Use Array.from to avoid TS iterator errors
    Array.from(responseCache.entries()).forEach(([key, _]) => {
      if (key.startsWith(`messages:${conversation_id}`)) {
        responseCache.delete(key);
      }
    });
    
    // Use the data access layer to send a message
    const { message, error } = await sendMessage(user, conversation_id, user.id, content);

    // Handle error
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Get the conversation to access user profile information
    // getConversationById expects authUser and conversationId
    const { conversation } = await getConversationById(user, conversation_id);
    
    // Find the sender in participants list
    const senderParticipant = conversation?.participants?.find(p => p.user_id === user.id);
    
    // Get display name and profile information
    let displayName = user.email || 'Unknown User';
    let avatarUrl = null;
    let isTutor = user.is_tutor || false;
    
    // Use the participant user data if available
    if (senderParticipant?.user) {
      const userData = senderParticipant.user as any;
      displayName = userData.display_name || userData.email || user.email || 'Unknown User';
      avatarUrl = userData.avatar_url || null;
      isTutor = userData.is_tutor || user.is_tutor || false;
    }

    // Transform the message to include sender display name
    const transformedMessage: TransformedMessage = {
      ...message,
      sender: {
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
        is_tutor: isTutor
      }
    };
    
    // Broadcast the message via Supabase realtime
    await broadcastMessage(transformedMessage, conversation_id);
    
    return NextResponse.json(transformedMessage);
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    console.error(`Unhandled error in postMessagesHandler: ${errorDetails}`);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: 500 });
  }
}

// Delete message handler
async function deleteMessageHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    console.log(`Deleting message: ${messageId}, user: ${user.id}`);

    // Invalidate the messages cache
    // This needs to be more generic since we don't know the conversation ID yet
    Array.from(responseCache.entries()).forEach(([key, _]) => {
      if (key.startsWith('messages:')) {
        responseCache.delete(key);
      }
    });
    
    // Delete the message
    const { success, error } = await deleteMessage(user, messageId);

    if (error) {
      const statusCode = error.includes('Not authorized') ? 403 : 
                         error.includes('not found') ? 404 : 500;
      return NextResponse.json({ error }, { status: statusCode });
    }

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    console.error(`Unhandled error in deleteMessageHandler: ${errorDetails}`);
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined 
    }, { status: 500 });
  }
}

// Export the wrapped route handlers
export const GET = withRouteAuth(getMessagesHandler);
export const POST = withRouteAuth(postMessagesHandler);
export const DELETE = withRouteAuth(deleteMessageHandler); 