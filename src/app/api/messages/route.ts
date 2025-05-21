import { NextRequest, NextResponse } from 'next/server';
import { getConversationById, sendMessage, Message } from '@/lib/db/messages';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';

// Export runtime config for improved performance
export const runtime = 'edge';

// Cache recent responses to reduce database load
const responseCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds TTL for cache

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

    // Start a performance timer
    const startTime = performance.now();

    // Create a cache key based on request parameters
    const cacheKey = `messages:${conversationId}:${limit}:${before || 'latest'}`;

    // Get the data from cache or fresh from database
    const result = await getCachedOrFresh(cacheKey, async () => {
      try {
        // Use the data access layer to get conversation and messages
        const { conversation, messages, error } = await getConversationById(user, conversationId);
        
        if (error || !conversation) {
          return { conversation, messages: [], error };
        }
        
        // Create a map of participants by user_id for faster lookups
        const participantsMap: Record<string, any> = {};
        conversation.participants?.forEach(participant => {
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
        return {
          conversation: null,
          transformedMessages: [],
          error: "Failed to process messages"
        };
      }
    });
    
    // Handle errors
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (!result.conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user is a participant
    const isParticipant = result.conversation.participants?.some(p => p.user_id === user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not authorized to access this conversation' }, { status: 403 });
    }

    // End the performance timer
    const endTime = performance.now();
    
    return NextResponse.json({ 
      messages: result.transformedMessages, 
      has_more: false, // The DAL doesn't currently support pagination
      processing_time_ms: Math.round(endTime - startTime)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    
    return NextResponse.json(transformedMessage);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

// Export the wrapped route handlers
export const GET = withRouteAuth(getMessagesHandler);
export const POST = withRouteAuth(postMessagesHandler); 