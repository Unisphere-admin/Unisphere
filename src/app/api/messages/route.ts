import { NextRequest, NextResponse } from 'next/server';
import { getConversationById, sendMessage, Message, deleteMessage } from '@/lib/db/messages';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { validateText, sanitizeInput, checkForMaliciousContent } from "@/lib/validation";
import { withCsrfProtection } from "@/lib/csrf-next";

// Export runtime config for improved performance


// Force dynamic to ensure messages are never cached by Vercel
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Helper function to create a response with proper cache headers
const createApiResponse = (data: any, status = 200) => {
  const response = NextResponse.json(data, { status });
  
  // Set cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
};

// Cache recent responses to reduce database load
const responseCache = new Map<string, { data: any, timestamp: number }>();
// Reduce TTL to 30 seconds for better real-time updates while still providing caching benefits
const CACHE_TTL = 30000; // 30 seconds TTL (reduced from 1 minute)

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

// Helper to invalidate cache for a specific conversation
const invalidateConversationCache = (conversationId: string) => {
  // Remove all cache entries related to this conversation
  Array.from(responseCache.keys()).forEach(key => {
    if (key.includes(`:${conversationId}:`)) {
      responseCache.delete(key);
    }
  });
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
    first_name: string;
    last_name: string;
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
      return createApiResponse({ error: 'Conversation ID is required' }, 400);
    }

    // Start a performance timer
    const startTime = performance.now();

    // Create a more specific cache key based on request parameters and user ID
    // Including user ID ensures different users get different caches
    const cacheKey = `messages:${conversationId}:${limit}:${before || 'latest'}:${user.id}`;

    // Get the data from cache or fresh from database
    const result = await getCachedOrFresh(cacheKey, async () => {
      try {
        // Use the data access layer to get conversation and messages
        const { conversation, messages, error } = await getConversationById(user, conversationId);
        
        if (error) {
          return { conversation, messages: [], error };
        }
        
        if (!conversation) {
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
          let firstName = '';
          let lastName = '';
          
          if (participant?.user) {
            const userData = participant.user as any;
            firstName = userData.first_name || '';
            lastName = userData.last_name || '';
            displayName = userData.display_name || 
                         (firstName && lastName ? `${firstName} ${lastName}` : '') || 
                         userData.email || 
                         'Unknown User';
            avatarUrl = userData.avatar_url || null;
            isTutor = userData.is_tutor || false;
          }
          
          return {
            ...message,
            sender: {
              id: message.sender_id,
              display_name: displayName,
              first_name: firstName,
              last_name: lastName,
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
        const errorDetails = innerError instanceof Error 
          ? innerError.message + (innerError.stack ? '\n' + innerError.stack : '') 
          : JSON.stringify(innerError);
        
        return {
          conversation: null,
          transformedMessages: [],
          error: "Failed to process messages"
        };
      }
    });
    
    // Handle errors
    if (result.error) {
      return createApiResponse({ error: result.error }, 500);
    }

    if (!result.conversation) {
      return createApiResponse({ error: 'Conversation not found' }, 404);
    }

    // Check if user is a participant
    const isParticipant = result.conversation.participants?.some(p => p.user_id === user.id);
    
    // Allow premium users or tutors to access any conversation even if not a participant
    if (!isParticipant && !(user.is_tutor || user.has_access)) {
      return createApiResponse({ error: 'Not authorized to access this conversation' }, 403);
    }

    // End the performance timer
    const endTime = performance.now();
    const processingTime = Math.round(endTime - startTime);
    
    // Create response with cache tag for user
    return createApiResponse({ 
      messages: result.transformedMessages, 
      has_more: false, // The DAL doesn't currently support pagination
      processing_time_ms: processingTime
    });
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    
    return createApiResponse({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined 
    }, 500);
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
    
  } catch (error) {
    // Silently handle error - don't break API response for broadcast failures
  }
};

// POST handler for sending messages
async function postMessagesHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { conversation_id, content } = body;
    
    if (!conversation_id) {
      return createApiResponse({ error: 'Conversation ID is required' }, 400);
    }
    
    if (!content) {
      return createApiResponse({ error: 'Message content is required' }, 400);
    }
    
    // Validate and sanitize the message content
    const sanitizedContent = sanitizeInput(content);
    
    // Basic validation for message content
    if (!validateText(sanitizedContent)) {
      return createApiResponse({ error: 'Invalid message content' }, 400);
    }
    
    // Check for malicious content
    if (checkForMaliciousContent(sanitizedContent)) {
      return createApiResponse({ 
        error: 'Message contains potentially harmful content'
      }, 400);
    }
    
    // Send the message
    const { message, error } = await sendMessage(user, conversation_id, user.id, sanitizedContent);
    
    if (error) {
      return createApiResponse({ error }, 500);
    }
    
    if (!message) {
      return createApiResponse({ error: 'Failed to send message' }, 500);
    }
    
    // Invalidate the conversation's message cache
    invalidateConversationCache(conversation_id);
    
    // Broadcast the message to all clients
    await broadcastMessage(message, conversation_id);
    
    return createApiResponse({ message });
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    
    return createApiResponse({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, 500);
  }
}

// DELETE handler for messages
async function deleteMessageHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('message_id');
    
    if (!messageId) {
      return createApiResponse({ error: 'Message ID is required' }, 400);
    }
    
    // Delete the message
    const { success, error } = await deleteMessage(user, messageId);
    
    let conversationId: string | undefined;

    // Handle errors
    if (error) {
      return createApiResponse({ error }, 500);
    }

    if (!success) {
      return createApiResponse({ error: 'Failed to delete message' }, 500);
    }

    // If deletion was successful, get the conversation ID from the message cache
    // or we could just invalidate all message caches
    // Invalidate all message caches to be safe
    Array.from(responseCache.keys()).forEach(key => {
      if (key.startsWith('messages:')) {
        const parts = key.split(':');
        if (parts.length > 1) {
          conversationId = parts[1];
        }
        responseCache.delete(key);
      }
    });
    
    return createApiResponse({ success: success });
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    
    return createApiResponse({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, 500);
  }
}

// Export the wrapped route handlers with added CSRF protection
export const GET = withRouteAuth(getMessagesHandler);
export const POST = withRouteAuth(withCsrfProtection(postMessagesHandler));
export const DELETE = withRouteAuth(withCsrfProtection(deleteMessageHandler)); 