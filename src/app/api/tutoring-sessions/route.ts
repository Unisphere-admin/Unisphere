import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { 
  createTutoringSessionAuth as createTutoringSession, 
  createTutoringSessionRequestAuth as createTutoringSessionRequest,
  updateSessionStatusAuth as updateSessionStatus, 
  updateReadyStatusAuth as updateReadyStatus, 
  getSessionByIdAuth as getSessionById, 
  getSessionsByConversation,
  getUserSessions,
  getSessionsByMessageId,
  TutoringSession 
} from '@/lib/db/tutoringSessions';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { createClient } from '@supabase/supabase-js';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { withCsrfProtection } from '@/lib/csrf-next';

// Disable Vercel's default caching behavior
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Cache recent responses to reduce database load
const responseCache = new Map<string, { data: any, timestamp: number }>();
// Reduce TTL to improve real-time responsiveness
const CACHE_TTL = 30000; // 30 seconds (reduced from 1 minute)

// Track the last modified time for each session
const sessionLastModified = new Map<string, number>();

// Helper to get cached responses or fetch new ones
const getCachedOrFresh = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: {
    forceRefresh?: boolean;
    sessionId?: string;
  } = {}
): Promise<T> => {
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  
  // Force refresh if requested
  if (options.forceRefresh) {
    const result = await fetchFn();
    responseCache.set(cacheKey, {
      data: result,
      timestamp: now
    });
    return result;
  }
  
  // Check if this is a specific session being requested
  if (options.sessionId) {
    const lastModified = sessionLastModified.get(options.sessionId) || 0;
    const cacheCreated = cached?.timestamp || 0;
    
    // If the session was modified after the cache was created, always fetch fresh
    if (lastModified > cacheCreated) {
      const result = await fetchFn();
      responseCache.set(cacheKey, {
        data: result,
        timestamp: now
      });
      return result;
    }
  }
  
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

// Extend the TutoringSession interface to include cost
interface ExtendedTutoringSession extends TutoringSession {
  cost?: number | null;
}

// Helper function to trigger a Supabase broadcast
const broadcastUpdate = async (session: ExtendedTutoringSession) => {
  try {
    // Record that this session was modified
    sessionLastModified.set(session.id, Date.now());
    
    // Use createRouteHandlerClientWithCookies to properly await cookies
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Get the full session data directly, including the cost
    const { data: fullSessionData, error: sessionError } = await supabase
      .from('tutoring_session')
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .eq('id', session.id)
      .single();
      
    if (sessionError) {
      // Continue with existing session data if there's an error
      console.warn('Error fetching full session data for broadcast:', sessionError);
    }
    
    // Use the complete session data if available, otherwise use the provided session
    const sessionToSend: ExtendedTutoringSession = fullSessionData || session;
    
    // Ensure cost is explicitly included
    const sessionWithCost = {
      ...sessionToSend,
      cost: sessionToSend.cost !== undefined ? sessionToSend.cost : null
    };
    
    // Force invalidation of this session's cache
    responseCache.delete(`session:${session.id}`);
    
    // Also invalidate any user caches that might contain this session
    if (sessionToSend.tutor_id) {
      responseCache.delete(`user_sessions:${sessionToSend.tutor_id}:tutor`);
    }
    if (sessionToSend.student_id) {
      responseCache.delete(`user_sessions:${sessionToSend.student_id}:student`);
    }
    
    // Use the same channel name format as in RealtimeContext
    const channelName = `tutoring_session:conversation:${sessionWithCost.conversation_id}`;
    const channel = supabase.channel(channelName);
    
    // Subscribe to the channel before sending
    await channel.subscribe();
    
    // Send the individual session update with an explicit emphasis on including the cost
    await channel.send({
      type: 'broadcast',
      event: 'session_update',
      payload: { 
        session: sessionWithCost
      }
    });
    
    // Also broadcast to update session lists for all participants
    channel.send({
      type: 'broadcast',
      event: 'session_list_update',
      payload: { 
        updated: true,
        timestamp: Date.now(),
        session_id: session.id
      }
    });
  } catch (error) {
    // Log error but don't break API response for broadcast failures
    console.error('Error broadcasting session update:', error);
  }
};

// Enhanced cache invalidation for sessions
const invalidateSessionCache = (conversationId: string, sessionId?: string, userId?: string) => {
  // Remove conversation sessions from cache
  const conversationCacheKey = `sessions:${conversationId}`;
  responseCache.delete(conversationCacheKey);
  
  // Invalidate specific session cache if provided
  if (sessionId) {
    const sessionCacheKey = `session:${sessionId}`;
    responseCache.delete(sessionCacheKey);
  }
  
  // Invalidate user session caches if affected
  if (userId) {
    // Both tutor and student types might be affected
    responseCache.delete(`user_sessions:${userId}:tutor`);
    responseCache.delete(`user_sessions:${userId}:student`);
  }
  
  // Find and remove any individual session cache entries for this conversation
  Array.from(responseCache.entries()).forEach(([key, value]) => {
    // Check if this cache entry is related to the conversation
    if (key.startsWith('session:') && 
        (value.data?.session?.conversation_id === conversationId ||
         value.data?.sessions?.some((s: any) => s.conversation_id === conversationId))) {
      responseCache.delete(key);
    }
    
    // Also clear session lists that might contain this session
    if (key.startsWith('user_sessions:') || key === 'cached_sessions') {
      responseCache.delete(key);
    }
  });
  
  // Also clear CACHE_CONFIG.SESSIONS_CACHE_KEY from browser cache via localStorage
  // This must be done on the client side, so we trigger it via the broadcast
};

// Helper function to get other user's tokens via edge function
async function getUserTokens(userId: string): Promise<number> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return 0;
    }

    // Refresh the session to get a fresh access token - no need to use getSession first
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !session || !session.access_token) {
      return 0;
    }

    // Use the supabase instance with the refreshed token
    const { data, error } = await supabase.functions.invoke('get-user-tokens', {
      body: { userId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (error) {
      return 0;
    }
    
    if (data && typeof data.tokens === 'number') {
      return data.tokens;
    }
    
    console.warn(`No token data returned for user ${userId}:`, data);
    return 0;
  } catch (error) {
    return 0;
  }
}

// Helper function to create a response with proper cache headers
const createApiResponse = (data: any, status = 200) => {
  const response = NextResponse.json(data, { status });
  
  // Set cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
};

// GET handler for tutoring sessions
async function getTutoringSessionsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');
    const messageId = searchParams.get('message_id');
    const userId = searchParams.get('user_id');
    const userType = searchParams.get('user_type');
    const sessionId = searchParams.get('session_id');
    
    // If session ID is provided, get a specific session by ID
    if (sessionId) {
      // Create a cache key that includes user ID to prevent cache conflicts
      const cacheKey = `session:${sessionId}:${user.id}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        return await getSessionById(user, sessionId);
      }, { sessionId });
      
      const { session, error } = result;
      
      if (error) {
        return createApiResponse({ error: 'Failed to fetch session' }, 500);
      }
      
      if (!session) {
        return createApiResponse({ error: 'Session not found' }, 404);
      }
      
      // Check if user is authorized to view this session
      const isAuthorized = session.tutor_id === user.id || session.student_id === user.id;
      
      if (!isAuthorized) {
        return createApiResponse({ error: 'Not authorized to access this session' }, 403);
      }
      
      return createApiResponse({ session });
    }
    
    // If user ID is provided, get the user's sessions
    if (userId && userType) {
      // Check if the user has permission to fetch these sessions
      if (userId !== user.id && !user.is_tutor) {
        return createApiResponse({ 
          error: 'Not authorized to access these sessions' 
        }, 403);
      }
      
      // Create a cache key that includes user ID and user type
      const cacheKey = `user_sessions:${userId}:${userType}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        return await getUserSessions(userId, userType as 'tutor' | 'student');
      }, { forceRefresh: true });
      
      const { sessions, error } = result;
      
      if (error) {
        return createApiResponse({ error }, 500);
      }
      
      return createApiResponse({ sessions });
    }
    
    // If message ID is provided, get the session associated with that message
    if (messageId) {
      // Create a cache key that includes the message ID and user ID
      const cacheKey = `message_sessions:${messageId}:${user.id}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        return await getSessionsByMessageId(messageId);
      }, { forceRefresh: true });
      
      const { sessions, error } = result;
      
      if (error) {
        return createApiResponse({ error: 'Failed to fetch sessions' }, 500);
      }
        
      // If no sessions found, return empty array
      if (!sessions || sessions.length === 0) {
        return createApiResponse({ sessions: [] });
      }
        
      // Check if user is authorized to view these sessions
      const isAuthorized = sessions.some(session => 
        session.tutor_id === user.id || session.student_id === user.id
      );
      
      if (!isAuthorized) {
        return createApiResponse({ error: 'Not authorized to access these sessions' }, 403);
      }
      
      return createApiResponse({ sessions });
    }
    
    // Otherwise, get sessions for a conversation
    if (!conversationId) {
      return createApiResponse({ error: 'Required parameters missing' }, 400);
    }
    
    try {
      // Create a cache key that includes the conversation ID and user ID
      const cacheKey = `sessions:${conversationId}:${user.id}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        // Direct call to getSessionsByConversation with only the conversationId parameter
        return await getSessionsByConversation(conversationId);
      }, { forceRefresh: true });
      
      if (result.error) {
        return createApiResponse({ error: result.error }, 500);
      }
      
      return createApiResponse({ sessions: result.sessions });
    } catch (error) {
      return createApiResponse({ error: 'Failed to fetch sessions' }, 500);
    }
  } catch (error) {
    return createApiResponse({ error: 'Internal server error' }, 500);
  }
}

// POST handler for tutoring sessions
async function postTutoringSessionsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { 
      conversation_id, 
      message_id, 
      tutor_id, 
      student_id, 
      name, 
      scheduled_for,
      status = "requested"
    } = body;
    
    // Validate required fields
    if (!conversation_id) {
      return createApiResponse({ error: 'Conversation ID is required' }, 400);
    }
    
    // Validate that status is one of the allowed values
    const allowedStatuses = ["requested", "accepted", "started", "ended", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return createApiResponse({ error: 'Invalid status value' }, 400);
    }
    
    // Check if the user has permission to create a session
    // Only the tutor or student involved can create a session
    if (tutor_id && student_id) {
      const isAuthorized = tutor_id === user.id || student_id === user.id;
      if (!isAuthorized) {
        return createApiResponse({ error: 'Not authorized to create this session' }, 403);
      }
    }
    
    // If this is a tutor creating a session, check if the student has enough tokens
    if (user.is_tutor && student_id) {
      // Get student's tokens
      const studentTokens = await getUserTokens(student_id);
      
      // Default cost is 5 tokens per session
      const sessionCost = 5;
      
      if (studentTokens < sessionCost) {
        return createApiResponse({
          error: 'Student does not have enough tokens for this session',
          required: sessionCost,
          available: studentTokens
        }, 402); // 402 Payment Required
      }
    }
    
    // Create the session
    let result;
    if (status === "requested") {
      // Create a session request
      result = await createTutoringSessionRequest(
        user,
        conversation_id,
        message_id,
        tutor_id,
        student_id,
        name,
        scheduled_for
      );
    } else {
      // Create a session with the specified status
      result = await createTutoringSession(
        user,
        conversation_id,
        message_id,
        tutor_id,
        student_id,
        name,
        scheduled_for
      );
    }
    
    const { session, error } = result;
    
    if (error) {
      return createApiResponse({ error }, 500);
    }
    
    if (!session) {
      return createApiResponse({ error: 'Failed to create session' }, 500);
    }
    
    // Invalidate caches
    invalidateSessionCache(conversation_id, undefined, user.id);
    
    // Broadcast the update to all clients
    await broadcastUpdate(session);
    
    return createApiResponse({ session });
  } catch (error) {
    return createApiResponse({ error: 'Internal server error' }, 500);
  }
}

// PATCH handler for tutoring sessions
async function patchTutoringSessionsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { session_id, action } = body;
    
    if (!session_id || !action) {
      return createApiResponse({ error: 'Session ID and action are required' }, 400);
    }
    
    // Get the session to check permissions
    const { session, error: getSessionError } = await getSessionById(user, session_id);
    
    if (getSessionError || !session) {
      return createApiResponse({ error: getSessionError || 'Session not found' }, 404);
    }
    
    // Check if the user has permission to update this session
    const isAuthorized = session.tutor_id === user.id || session.student_id === user.id;
    
    if (!isAuthorized) {
      return createApiResponse({ error: 'Not authorized to update this session' }, 403);
    }
    
    let result;
    
    // Handle different actions
    switch (action) {
      case 'update_status': {
        const { status } = body;
        
        if (!status) {
          return createApiResponse({ error: 'Status is required' }, 400);
        }
        
        // Validate that status is one of the allowed values
        const allowedStatuses = ["requested", "accepted", "started", "ended", "cancelled"];
        if (!allowedStatuses.includes(status)) {
          return createApiResponse({ error: 'Invalid status value' }, 400);
        }
        
        // Additional checks for specific status transitions
        if (status === 'started') {
          // Only tutor can start a session
          if (user.id !== session.tutor_id) {
            return createApiResponse({ error: 'Only the tutor can start a session' }, 403);
          }
          
          // Session must be in 'accepted' status to be started
          if (session.status !== 'accepted') {
            return createApiResponse({ error: 'Session must be accepted before it can be started' }, 400);
          }
          
          // Both participants should be ready
          if (!session.tutor_ready || !session.student_ready) {
            // Allow starting if tutor is ready (changed requirement)
            if (!session.tutor_ready) {
              return createApiResponse({ error: 'Tutor must be ready to start the session' }, 400);
            }
          }
        }
        
        result = await updateSessionStatus(user, session_id, status);
        break;
      }
      
      case 'set_ready': {
        const { is_ready } = body;
        
        if (is_ready === undefined) {
          return createApiResponse({ error: 'Ready status is required' }, 400);
        }
        
        result = await updateReadyStatus(user, session_id, is_ready);
        break;
      }
      
      default:
        return createApiResponse({ error: 'Invalid action' }, 400);
    }
    
    const { session: updatedSession, error: updateError } = result;
    
    if (updateError) {
      return createApiResponse({ error: updateError }, 500);
    }
    
    if (!updatedSession) {
      return createApiResponse({ error: 'Failed to update session' }, 500);
    }
    
    // Invalidate caches
    invalidateSessionCache(updatedSession.conversation_id, session_id, user.id);
    
    // Broadcast the update to all clients
    await broadcastUpdate(updatedSession);
    
    return createApiResponse({ session: updatedSession });
  } catch (error) {
    return createApiResponse({ error: 'Internal server error' }, 500);
  }
}

// Convert the manually implemented auth handlers to use the withRouteAuth pattern
export const GET = withRouteAuth(getTutoringSessionsHandler);
export const POST = withRouteAuth(withCsrfProtection(postTutoringSessionsHandler));
export const PATCH = withRouteAuth(withCsrfProtection(patchTutoringSessionsHandler)); 