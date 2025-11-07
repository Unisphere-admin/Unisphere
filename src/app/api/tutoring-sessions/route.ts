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

// Export runtime config for improved performance


// Force dynamic to ensure tutoring sessions are never cached by Vercel
export const dynamic = 'force-dynamic';

// Cache recent responses to reduce database load
const responseCache = new Map<string, { data: any, timestamp: number }>();
// Reduce TTL to 1 minute for better real-time updates while still providing caching benefits
const CACHE_TTL = 60000; // 1 minute TTL (reduced from 15 minutes)

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
      // Continue with existing session data if there's an error
    }
    
    // Use the complete session data if available, otherwise use the provided session
    const sessionToSend: ExtendedTutoringSession = fullSessionData || session;
    
    // Use the same channel name format as in RealtimeContext
    const channelName = `tutoring_session:conversation:${sessionToSend.conversation_id}`;
    const channel = supabase.channel(channelName);
    
    // Subscribe to the channel before sending
    await channel.subscribe();
    
    // Send the individual session update with all critical fields explicitly included
    await channel.send({
      type: 'broadcast',
      event: 'session_update',
      payload: { 
        session: {
          ...sessionToSend,
          // Make sure critical fields are explicitly included
          cost: sessionToSend.cost,
          created_at: sessionToSend.created_at || new Date().toISOString(),
          id: sessionToSend.id,
          conversation_id: sessionToSend.conversation_id,
          status: sessionToSend.status,
          // Explicitly include message_id (which may be null)
          message_id: sessionToSend.message_id || null
        } 
      }
    });
    
    // Also broadcast to update session lists for all participants
    channel.send({
      type: 'broadcast',
      event: 'session_list_update',
      payload: { 
        updated: true,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    // Silently handle error - don't break API response for broadcast failures
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
    
    return 0;
  } catch (error) {
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
    const sessionId = searchParams.get('session_id');
    
    // If session ID is provided, get a specific session by ID
    if (sessionId) {
      // Create a cache key that includes user ID to prevent cache conflicts
      const cacheKey = `session:${sessionId}:${user.id}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        return await getSessionById(user, sessionId);
      });
      
      const { session, error } = result;
      
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
      }
      
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Check if user is authorized to view this session
      const isAuthorized = session.tutor_id === user.id || session.student_id === user.id;
      
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Not authorized to access this session' }, { status: 403 });
      }
      
      const response = NextResponse.json({ session });
      response.headers.set('Cache-Tag', `user-${user.id}`);
      return response;
    }
    
    // If user ID is provided, get the user's sessions
    if (userId && userType) {
      // Check if the user has permission to fetch these sessions
      if (userId !== user.id && !user.is_tutor) {
        return NextResponse.json({ 
          error: 'Not authorized to access these sessions' 
        }, { status: 403 });
      }
      
      // Create a cache key that includes user ID and user type
      const cacheKey = `user_sessions:${userId}:${userType}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        return await getUserSessions(userId, userType as 'tutor' | 'student');
      });
      
      const { sessions, error } = result;
      
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
      // Create a cache key that includes the message ID and user ID
      const cacheKey = `message_sessions:${messageId}:${user.id}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        return await getSessionsByMessageId(messageId);
      });
      
      const { sessions, error } = result;
      
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
      }
        
      // If no sessions found, return empty array
      if (!sessions || sessions.length === 0) {
        const response = NextResponse.json({ sessions: [] });
          response.headers.set('Cache-Tag', `user-${user.id}`);
          return response;
        }
        
      // Check if user is authorized to view these sessions
      const isAuthorized = sessions.some(session => 
        session.tutor_id === user.id || session.student_id === user.id
      );
      
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Not authorized to access these sessions' }, { status: 403 });
      }
      
      const response = NextResponse.json({ sessions });
      // Add cache tag for this user to enable proper invalidation on logout
      response.headers.set('Cache-Tag', `user-${user.id}`);
      return response;
    }
    
    // Otherwise, get sessions for a conversation
    if (!conversationId) {
      return NextResponse.json({ error: 'Required parameters missing' }, { status: 400 });
    }
    
    try {
      // Create a cache key that includes the conversation ID and user ID
      const cacheKey = `sessions:${conversationId}:${user.id}`;
      
      const result = await getCachedOrFresh(cacheKey, async () => {
        // Direct call to getSessionsByConversation with only the conversationId parameter
        return await getSessionsByConversation(conversationId);
      });
      
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      
      const response = NextResponse.json({ sessions: result.sessions });
      // Add cache tag for this user to enable proper invalidation on logout
      response.headers.set('Cache-Tag', `user-${user.id}`);
      return response;
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
  } catch (error) {
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
    const { 
      conversation_id, 
      student_id, 
      tutor_id, 
      scheduled_for, 
      name, 
      status: requestedStatus, 
      cost
    } = body;
    
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
    const options: { 
      scheduled_for?: string; 
      name?: string; 
      message_id?: string; 
      cost?: number 
    } = {};
    
    if (scheduled_for) options.scheduled_for = scheduled_for;
    if (name) options.name = name;
    // message_id is still accepted if provided, but completely optional
    if (body.message_id) options.message_id = body.message_id;
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
    
    // Create the session object - no message_id required
    const sessionData: any = {
      conversation_id,
      tutor_id: user.id, // Tutor is the current user
      student_id,
      status: isCreateRequest ? 'requested' : 'accepted',
      tutor_ready: false,
      student_ready: false,
      // Ensure created_at is set explicitly for consistent ordering
      created_at: new Date().toISOString()
    };
    
    // Add optional message_id if provided
    if (body.message_id) {
      sessionData.message_id = body.message_id;
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
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
    
    // Invalidate all relevant caches
    if (session) {
      invalidateSessionCache(
        conversation_id,
        session.id,
        student_id  // Invalidate student's caches
      );
      
      // Also invalidate tutor's caches
      if (user.id) {
        invalidateSessionCache(conversation_id, session.id, user.id);
      }
      
      // Broadcast the update with the extended interface
      await broadcastUpdate(session as ExtendedTutoringSession);
    } else {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    
    return NextResponse.json({ session });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
    
    // Get the session details to find conversation ID for cache invalidation
    const supabase = await createRouteHandlerClientWithCookies();
    const { data: sessionData } = await supabase
      .from('tutoring_session')
      .select('conversation_id, tutor_id, student_id, cost')
      .eq('id', session_id)
      .single();
      
    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Store participants for cache invalidation
    const participantIds = [
      sessionData.tutor_id, 
      sessionData.student_id
    ].filter(Boolean);
    
    let response;
    
    // Handle different actions
    switch (action) {
      case 'update_status':
        if (!status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }
        
        // If accepting a session, check student's tokens against the session cost
        if (status === 'accepted') {
          // We already have session data from above
          const sessionCost = sessionData.cost || 1;
          const studentId = sessionData.student_id;

          // ============================================================================
          // CRITICAL: Atomically deduct credits BEFORE accepting the session
          // This prevents race conditions and ensures credits are always deducted
          // ============================================================================

          console.log(`💳 Session acceptance requested - Cost: ${sessionCost} credit(s)`);
          console.log(`👤 Student: ${studentId}, Accepting user: ${user.id}`);

          // Create admin client for atomic credit deduction
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          // Use atomic database function to deduct credits
          const { data: deductResult, error: deductError } = await supabaseAdmin
            .rpc('atomic_deduct_credits', {
              p_user_id: studentId,
              p_credits_to_deduct: sessionCost,
              p_allow_negative: false
            });

          if (deductError) {
            console.error('❌ Error deducting credits:', deductError);
            return NextResponse.json({
              error: `Failed to deduct credits: ${deductError.message}`
            }, { status: 500 });
          }

          // Check if deduction was successful
          const result = deductResult[0];
          if (!result.success) {
            console.log(`❌ Credit deduction failed: ${result.error_message}`);
            return NextResponse.json({
              error: result.error_message || 'Insufficient credits'
            }, { status: 400 });
          }

          console.log(`✅ Credits deducted successfully!`);
          console.log(`   Old balance: ${result.old_balance}`);
          console.log(`   New balance: ${result.new_balance}`);
          console.log(`   Credits deducted: ${result.credits_deducted}`);

          // Now that credits are deducted, update the session status
          // If this fails, credits will be refunded by the Edge Function when status changes to cancelled
          console.log(`🔄 Updating session status to: ${status}`);
          response = await updateSessionStatus(user, session_id, status);

          // Check if session update succeeded
          if ('error' in response && response.error) {
            console.error(`❌ Session status update failed after credit deduction!`);
            console.error(`   Error: ${response.error}`);
            console.error(`   This is a critical error - credits were deducted but session not accepted`);
            console.error(`   User should cancel the session to get refund`);
            // Return error to client so they know something went wrong
            return NextResponse.json({
              error: `Session update failed: ${response.error}. Credits were deducted. Please contact support or try cancelling the session.`,
              creditsDeducted: true
            }, { status: 500 });
          } else if (!response.session) {
            console.error(`❌ Session update returned no session data!`);
            return NextResponse.json({
              error: 'Session update failed - no session data returned',
              creditsDeducted: true
            }, { status: 500 });
          } else {
            console.log(`✅ Session ${session_id} status updated successfully to: ${response.session.status}`);
            console.log(`   Session ID: ${response.session.id}`);
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
      // Clear all caches related to this session and conversation
      invalidateSessionCache(sessionData.conversation_id, session_id);
      
      // Also invalidate caches for all participants
      participantIds.forEach(participantId => {
        if (participantId) {
          invalidateSessionCache(sessionData.conversation_id, session_id, participantId);
        }
      });
      
      // Broadcast the update with the extended interface
      await broadcastUpdate(response.session as ExtendedTutoringSession);
    }
    
    return NextResponse.json({ session: response.session });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Convert the manually implemented auth handlers to use the withRouteAuth pattern
export const GET = withRouteAuth(getTutoringSessionsHandler);
export const POST = withRouteAuth(withCsrfProtection(postTutoringSessionsHandler));
export const PATCH = withRouteAuth(withCsrfProtection(patchTutoringSessionsHandler)); 