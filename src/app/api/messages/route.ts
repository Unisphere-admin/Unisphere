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

// Reduce TTL to 15 seconds for better real-time updates while still providing caching benefits
const CACHE_TTL = 15000; // 15 seconds TTL (reduced from 1 minute)

// Helper to get cached responses or fetch new ones - use localStorage instead of in-memory cache
const getCachedOrFresh = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: { forceRefresh?: boolean } = {}
): Promise<T> => {
  // Force refresh if requested
  if (options.forceRefresh) {
    const result = await fetchFn();
    
    // Still save to cache for other components to use
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return result;
  }
  
  // Try to get from localStorage
  try {
    const cachedItem = localStorage.getItem(cacheKey);
    
    if (cachedItem) {
      const { data, timestamp } = JSON.parse(cachedItem);
      
      // Use a very short TTL to ensure relatively fresh data
      if (Date.now() - timestamp < CACHE_TTL) {
        return data as T;
      }
    }
    
    // Cache miss or expired, fetch fresh data
    const freshData = await fetchFn();
    
    // Save to cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: freshData,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return freshData;
  } catch (error) {
    // If anything goes wrong, just try to fetch fresh data
    return fetchFn();
  }
};

// Helper to invalidate cache for a specific conversation
const invalidateConversationCache = (conversationId: string) => {
  // Remove all cache entries related to this conversation
  try {
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`:${conversationId}:`)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
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
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
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
    
    
    // Create response with cache tag for user
    const response = NextResponse.json({ 
      messages: result.transformedMessages, 
      has_more: false, // The DAL doesn't currently support pagination
      processing_time_ms: processingTime
    });
    
    // Add cache tag for this user to enable proper invalidation on logout
    response.headers.set('Cache-Tag', `user-${user.id}`);
    
    return response;
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    
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
    
  } catch (error) {
    // Silently handle error - don't break API response for broadcast failures
  }
};

// POST handler for messages - updated with CSRF protection
async function postMessagesHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    const { conversation_id, conversationId, content, options } = body;

    // Normalize conversation ID parameter (handle both conversation_id and conversationId)
    const normalizedConversationId = conversation_id || conversationId;

    // Enhanced conversation ID validation
    if (!normalizedConversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    if (typeof normalizedConversationId !== 'string' || normalizedConversationId.trim() === '') {
      return NextResponse.json({ error: "Invalid conversation ID format" }, { status: 400 });
    }

    // Validate and sanitize message content
    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const validationResult = validateText(content, { 
      min: 1, 
      max: 5000,
      allowHtml: false,
      trim: true 
    });

    if (!validationResult.valid) {
      return NextResponse.json({ 
        error: validationResult.error || "Invalid message content" 
      }, { status: 400 });
    }

    // Check for potentially malicious content
    if (checkForMaliciousContent(validationResult.value)) {
      return NextResponse.json({ 
        error: "Message contains invalid content" 
      }, { status: 400 });
    }

    const sanitizedContent = validationResult.value;
    
    // Set the sender ID to the authenticated user's ID
    const senderId = user.id;
    
    // Set options defaults if not provided
    const messageOptions = options || { maxRetries: 1 };
    
    // Track retries for robust error handling
    let retryCount = 0;
    const maxRetries = messageOptions.maxRetries || 1;
    
    let message = null;
    let error = null;
    
    // Retry loop for better resilience
    while (retryCount <= maxRetries) {
      try {
        // Send the message
        const result = await sendMessage(user, normalizedConversationId, senderId, sanitizedContent);
        message = result.message;
        error = result.error;
        
        // If successful or error is not retryable, break the loop
        if (message || (error && !error.includes("network") && !error.includes("timeout"))) {
          break;
        }
      } catch (err) {
        // Store the error for better error reporting
        error = err instanceof Error ? err.message : String(err);
      }
      
      retryCount++;
      if (retryCount <= maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount - 1)));
      }
    }
    
    // Handle errors after retries
    if (error) {
      
      // Provide more specific error messages for common issues
      if (error.includes("not found") || error.includes("doesn't exist")) {
        return NextResponse.json({ 
          error: "Conversation not found or no longer available" 
        }, { status: 404 });
      }
      
      if (error.includes("permission") || error.includes("not authorized") || error.includes("access")) {
        return NextResponse.json({ 
          error: "You don't have permission to send messages in this conversation" 
        }, { status: 403 });
      }
      
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!message) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    // Immediately invalidate the cache for this conversation to ensure fresh data
    invalidateConversationCache(normalizedConversationId);

    // Broadcast message to realtime subscribers
    await broadcastMessage(message, normalizedConversationId);
    
    return NextResponse.json(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred", details: errorMessage },
      { status: 500 }
    );
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

    // Get the conversation ID to invalidate its cache after deletion
    const supabase = await createRouteHandlerClientWithCookies();
    const { data: messageData } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', messageId)
      .single();
      
    // If we found the message, prepare to invalidate its conversation cache
    const conversationId = messageData?.conversation_id;

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

    // If we have the conversation ID, invalidate its cache
    if (conversationId) {
      invalidateConversationCache(conversationId);
    } else {
      // Otherwise invalidate all message caches to be safe
      try {
        // Get all localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('messages:')) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? error.message + (error.stack ? '\n' + error.stack : '') 
      : JSON.stringify(error);
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined 
    }, { status: 500 });
  }
}

// Export the wrapped route handlers with added CSRF protection
export const GET = withRouteAuth(getMessagesHandler);
export const POST = withRouteAuth(withCsrfProtection(postMessagesHandler));
export const DELETE = withRouteAuth(withCsrfProtection(deleteMessageHandler)); 