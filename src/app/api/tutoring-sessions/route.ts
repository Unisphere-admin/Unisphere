import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { 
  createTutoringSessionAuth as createTutoringSession, 
  createTutoringSessionRequestAuth as createTutoringSessionRequest,
  updateSessionStatusAuth as updateSessionStatus, 
  updateReadyStatusAuth as updateReadyStatus, 
  getSessionByIdAuth as getSessionById, 
  getSessionsByConversationAuth as getSessionsByConversation,
  getUserSessions,
  getSessionsByMessageId,
  TutoringSession 
} from '@/lib/db/tutoringSessions';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { createClient } from '@supabase/supabase-js';
import { withRouteAuth } from '@/lib/auth/validateRequest';

// Export runtime config for improved performance
export const runtime = 'edge';

// Force dynamic to ensure tutoring sessions are never cached by Vercel
export const dynamic = 'force-dynamic';

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

// Extend the TutoringSession interface to include cost
interface ExtendedTutoringSession extends TutoringSession {
  cost?: number | null;
}

// Helper function to trigger a Supabase broadcast
const broadcastUpdate = async (session: ExtendedTutoringSession) => {
  try {
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
      console.error("Error fetching complete session data for broadcast:", sessionError);
      // Continue with existing session data if there's an error
    }
    
    // Use the complete session data if available, otherwise use the provided session
    const sessionToSend: ExtendedTutoringSession = fullSessionData || session;
    
    // Use the same channel name format as in RealtimeContext
    const channelName = `tutoring_session:conversation:${sessionToSend.conversation_id}`;
    const channel = supabase.channel(channelName);
    
    // Subscribe to the channel before sending
    await channel.subscribe();
    
    // Send the individual session update with an explicit emphasis on including the cost
    await channel.send({
      type: 'broadcast',
      event: 'session_update',
      payload: { 
        session: {
          ...sessionToSend,
          // Make sure cost is explicitly included
          cost: sessionToSend.cost
        } 
      }
    });
    
    // We no longer need to send a list update broadcast
    // This prevents unnecessary API calls to refresh the entire session list
  } catch (error) {
    console.error("Error broadcasting session update:", error);
    // Silently handle error - don't break API response for broadcast failures
  }
};

// Helper to invalidate cache for a conversation's sessions
const invalidateSessionCache = (conversationId: string) => {
  // Remove conversation sessions from cache
  const cacheKey = `sessions:${conversationId}`;
  responseCache.delete(cacheKey);
  
  // Find and remove any individual session cache entries for this conversation
  // Convert the Map entries to an array to avoid iteration issues
  Array.from(responseCache.entries()).forEach(([key, value]) => {
    if (key.startsWith('session:') && value.data?.session?.conversation_id === conversationId) {
      responseCache.delete(key);
    }
  });
};

// Helper function to get other user's tokens via edge function
async function getUserTokens(userId: string): Promise<number> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("No authenticated user available to call edge function:", userError);
      return 0;
    }

    // Refresh the session to get a fresh access token - no need to use getSession first
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !session || !session.access_token) {
      console.error("Failed to refresh session:", refreshError);
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
      console.error("Error fetching user tokens via edge function:", error);
      return 0;
    }
    
    if (data && typeof data.tokens === 'number') {
      return data.tokens;
    }
    
    console.warn(`No token data returned for user ${userId}:`, data);
    return 0;
  } catch (error) {
    console.error("Failed to fetch tokens from edge function:", error);
    return 0;
  }
}

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
    
    // If user ID is provided, get the user's sessions
    if (userId && userType) {
      // Check if the user has permission to fetch these sessions
      if (userId !== user.id && !user.is_tutor) {
        return NextResponse.json({ 
          error: 'Not authorized to access these sessions' 
        }, { status: 403 });
      }
      
      const { sessions, error } = await getUserSessions(userId, userType as 'tutor' | 'student');
      
      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }
      
      const response = NextResponse.json({ sessions });
      // Add cache tag for this user to enable proper invalidation on logout
      response.headers.set('Cache-Tag', `user-${user.id}`);
      return response;
    }
    
    // If message ID is provided, get the session associated with that message
    if (messageId) {
      console.log(`API route: Getting sessions for message ID ${messageId}`);
      const { sessions, error } = await getSessionsByMessageId(messageId);
      
      if (error) {
        console.error(`Error getting sessions for message ${messageId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
      }
      
      // If no sessions found, return empty array
      if (!sessions || sessions.length === 0) {
        console.log(`No sessions found for message ${messageId}`);
        const response = NextResponse.json({ sessions: [] });
        response.headers.set('Cache-Tag', `user-${user.id}`);
        return response;
      }
      
      // Check if user is authorized to view these sessions
      const isAuthorized = sessions.some(session => 
        session.tutor_id === user.id || session.student_id === user.id
      );
      
      if (!isAuthorized) {
        console.log(`User ${user.id} not authorized to access sessions for message ${messageId}`);
        return NextResponse.json({ error: 'Not authorized to access these sessions' }, { status: 403 });
      }
      
      console.log(`Found ${sessions.length} sessions for message ${messageId}`);
      const response = NextResponse.json({ sessions });
      // Add cache tag for this user to enable proper invalidation on logout
      response.headers.set('Cache-Tag', `user-${user.id}`);
      return response;
    }
    
    // Otherwise, get sessions for a conversation
    if (!conversationId) {
      return NextResponse.json({ error: 'Required parameters missing' }, { status: 400 });
    }
    
    const cacheKey = `sessions:${conversationId}`;
    
    const { sessions, error, authError } = await getCachedOrFresh(
      cacheKey,
      () => getSessionsByConversation(user, conversationId)
    );
    
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    
    const response = NextResponse.json({ sessions });
    // Add cache tag for this user to enable proper invalidation on logout
    response.headers.set('Cache-Tag', `user-${user.id}`);
    return response;
  } catch (error) {
    console.error("Error in GET tutoring sessions handler:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for creating tutoring sessions
async function postTutoringSessionsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { conversation_id, message_id, student_id, tutor_id, scheduled_for, name, status: requestedStatus, cost } = body;
    
    if (!conversation_id) {
      return NextResponse.json({ 
        error: 'Conversation ID is required' 
      }, { status: 400 });
    }

    // Ensure only tutors can create sessions - new restriction
    if (!user.is_tutor) {
      return NextResponse.json({ 
        error: 'Only tutors can create tutoring sessions' 
      }, { status: 403 });
    }

    // Create options object for optional fields
    const options: { scheduled_for?: string; name?: string; cost?: number } = {};
    if (scheduled_for) options.scheduled_for = scheduled_for;
    if (name) options.name = name;
    if (cost !== undefined) options.cost = cost;
    
    // No longer need to check student tokens during session creation
    if (!student_id) {
      return NextResponse.json({ 
        error: 'Student ID is required when creating a session' 
      }, { status: 400 });
    }
    
    let result;
    
    // Check if the tutor wants to create a request or directly accept
    const isCreateRequest = requestedStatus === 'requested';
    
    // Create the session object - note that message_id may be null
    const sessionData: any = {
      conversation_id,
      tutor_id: user.id, // Tutor is the current user
      student_id,
      status: isCreateRequest ? 'requested' : 'accepted',
      tutor_ready: false,
      student_ready: false
    };
    
    // Add optional message_id if provided
    if (message_id) {
      sessionData.message_id = message_id;
    }
    
    // Add other optional fields
    if (scheduled_for) sessionData.scheduled_for = scheduled_for;
    if (name) sessionData.name = name;
    if (cost !== undefined) sessionData.cost = cost;
    
    // Create a client
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Insert the session
    const { data: session, error: sessionError } = await supabase
      .from('tutoring_session')
      .insert(sessionData)
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .single();
    
    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
    
    // Invalidate cache for this conversation
    if (session) {
      invalidateSessionCache(conversation_id);
      
      // Broadcast the update with the extended interface
      await broadcastUpdate(session as ExtendedTutoringSession);
    } else {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    
    return NextResponse.json({ session });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Exception in session creation handler:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PATCH handler for updating tutoring sessions
async function patchTutoringSessionsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { session_id, action, status, message_id } = body;
    
    if (!session_id || !action) {
      return NextResponse.json({ 
        error: 'Session ID and action are required' 
      }, { status: 400 });
    }
    
    let response;
    
    // Handle different actions
    switch (action) {
      case 'update_status':
        if (!status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }
        
        // If accepting a session, check student's tokens against the session cost
        if (status === 'accepted') {
          // Get the session details to find student ID and cost
          const client = await createRouteHandlerClientWithCookies();
          const { data: sessionData } = await client
            .from('tutoring_session')
            .select('tutor_id, student_id, cost')
            .eq('id', session_id)
            .single();
            
          if (sessionData) {
            const sessionCost = sessionData.cost || 1;
            
            if (user.id === sessionData.student_id) {
              // Student is accepting - check own tokens
              if (user.tokens !== undefined && user.tokens < sessionCost) {
                return NextResponse.json({ 
                  error: `You don't have enough tokens for this session. Required: ${sessionCost}, Available: ${user.tokens}` 
                }, { status: 400 });
              }
              response = await updateSessionStatus(user, session_id, status);
            } else if (user.id === sessionData.tutor_id) {
            // Tutor is accepting - check student tokens via edge function
            const studentTokens = await getUserTokens(sessionData.student_id);
              if (studentTokens < sessionCost) {
              return NextResponse.json({ 
                  error: `Student does not have enough tokens for this session. Required: ${sessionCost}, Available: ${studentTokens}` 
              }, { status: 400 });
            }
            
            // Pass the tokens to the updateSessionStatus function
            response = await updateSessionStatus(user, session_id, status, studentTokens);
          } else {
              return NextResponse.json({ error: 'Not authorized to update this session' }, { status: 403 });
            }
          } else {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
          }
        } else {
        response = await updateSessionStatus(user, session_id, status);
        }
        break;
        
      case 'set_ready':
        const isReady = body.is_ready === true;
        response = await updateReadyStatus(user, session_id, isReady);
        break;
        
      case 'update_message_id':
        if (!message_id) {
          return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
        }

        // Update the message ID for the session
        const supabase = await createRouteHandlerClientWithCookies();
        
        // First get the session details to verify user permissions
        const { data: sessionData, error: sessionError } = await supabase
          .from('tutoring_session')
          .select('conversation_id, tutor_id, student_id')
          .eq('id', session_id)
          .single();

        if (sessionError || !sessionData) {
          console.error("Error fetching session for message ID update:", sessionError);
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Check if user is part of the session
        if (sessionData.tutor_id !== user.id && sessionData.student_id !== user.id) {
          return NextResponse.json({ error: 'Not authorized to update this session' }, { status: 403 });
        }

        // Update the message ID
        const { data, error } = await supabase
          .from('tutoring_session')
          .update({ message_id })
          .eq('id', session_id)
          .select(`
            *,
            tutor_profile:tutor_id(first_name, last_name),
            student_profile:student_id(first_name, last_name)
          `)
          .single();

        if (error) {
          console.error("Error updating session message ID:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        response = { session: data };
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Check for auth errors first (using type checking)
    if ('authError' in response && response.authError) {
      return NextResponse.json({ error: response.authError }, { status: 401 });
    }
    
    if (response.error) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }
    
    // Invalidate cache and broadcast the update
    if (response.session) {
      // Clear cache
      invalidateSessionCache(response.session.conversation_id);
      responseCache.delete(`session:${session_id}`);
      
      // Also clear any user session caches that might include this session
      responseCache.delete(`user_sessions:${response.session.tutor_id}:tutor`);
      responseCache.delete(`user_sessions:${response.session.student_id}:student`);
      
      // Broadcast the update with the extended interface
      await broadcastUpdate(response.session as ExtendedTutoringSession);
    }
    
    return NextResponse.json({ session: response.session });
  } catch (error) {
    console.error("Error handling PATCH request:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Convert the manually implemented auth handlers to use the withRouteAuth pattern
export const GET = withRouteAuth(getTutoringSessionsHandler);
export const POST = withRouteAuth(postTutoringSessionsHandler);
export const PATCH = withRouteAuth(patchTutoringSessionsHandler); 