import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { 
  createTutoringSessionAuth as createTutoringSession, 
  updateSessionStatusAuth as updateSessionStatus, 
  updateReadyStatusAuth as updateReadyStatus, 
  getSessionByIdAuth as getSessionById, 
  getSessionsByConversationAuth as getSessionsByConversation,
  getUserSessions,
  TutoringSession 
} from '@/lib/db/tutoringSessions';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Export runtime config for improved performance
export const runtime = 'edge';

// Cache recent responses to reduce database load
const responseCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10000; // Increased to 10 seconds TTL for better performance

// Helper to get cached responses or fetch new ones
const getCachedOrFresh = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  
  // Use cache if available and not expired
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    console.log(`Using cached response for ${cacheKey}`);
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

// Helper function to trigger a Supabase broadcast
const broadcastUpdate = async (session: TutoringSession) => {
  try {
    // Use createRouteHandlerClientWithCookies to properly await cookies
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Use the same channel name format as in RealtimeContext
    const channelName = `tutoring_session:conversation:${session.conversation_id}`;
    const channel = supabase.channel(channelName);
    
    // Subscribe to the channel before sending
    await channel.subscribe();
    
    // Send the individual session update
    await channel.send({
      type: 'broadcast',
      event: 'session_update',
      payload: { session }
    });
    
    // Also send the list update broadcast to refresh all clients
    await channel.send({
      type: 'broadcast',
      event: 'session_list_update',
      payload: { conversation_id: session.conversation_id }
    });
  } catch (error) {
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

// Helper function to get authenticated user
async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error("Auth error in tutoring sessions API:", error?.message || "No user found");
      return null;
    }
    
    return {
      id: user.id,
      email: user.email || '',
      is_tutor: user.user_metadata?.is_tutor === true
    };
  } catch (error) {
    console.error("Unexpected error in tutoring sessions auth check:", error);
    return null;
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
    const sessionId = searchParams.get('session_id');
    const userId = searchParams.get('userId') || user.id; // Default to authenticated user if userId not provided
    const userType = searchParams.get('userType');
    
    // If userId and userType are provided, get user sessions
    if (userType === 'tutor' || userType === 'student') {
      // No need to validate userId === user.id, just use the current authenticated user's ID
      // This fixes the 400 Bad Request error
      const cacheKey = `user_sessions:${user.id}:${userType}`;
      
      const { sessions, error } = await getCachedOrFresh(
        cacheKey,
        () => getUserSessions(user.id, userType as 'tutor' | 'student')
      );
      
      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }
      
      return NextResponse.json({ sessions });
    }
    
    // If session ID is provided, get a specific session
    if (sessionId) {
      const cacheKey = `session:${sessionId}`;
      
      const { session, error, authError } = await getCachedOrFresh(
        cacheKey,
        () => getSessionById(user, sessionId)
      );
      
      if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
      }
      
      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }
      
      return NextResponse.json({ session });
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
    
    return NextResponse.json({ sessions });
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
    const { conversation_id, message_id, student_id, scheduled_for, name } = body;
    
    if (!conversation_id || !message_id || !student_id) {
      return NextResponse.json({ 
        error: 'Conversation ID, message ID, and student ID are required' 
      }, { status: 400 });
    }
    
    // Create options object for optional fields
    const options: { scheduled_for?: string; name?: string } = {};
    if (scheduled_for) options.scheduled_for = scheduled_for;
    if (name) options.name = name;
    
    // Create the session
    const { session, error, authError } = await createTutoringSession(
      user,
      conversation_id,
      message_id,
      user.id, // Tutor ID is the current authenticated user
      student_id,
      options
    );
    
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    
    // Invalidate cache for this conversation
    if (session) {
      invalidateSessionCache(conversation_id);
      
      // Broadcast the update
      await broadcastUpdate(session);
    }
    
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH handler for updating tutoring sessions
async function patchTutoringSessionsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { session_id, action, status } = body;
    
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
        
        response = await updateSessionStatus(user, session_id, status);
        break;
        
      case 'set_ready':
        const isReady = body.is_ready === true;
        response = await updateReadyStatus(user, session_id, isReady);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    if (response.authError) {
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
      
      // Broadcast the update
      await broadcastUpdate(response.session);
    }
    
    return NextResponse.json({ session: response.session });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Custom wrapper function - keeping for reference but not using it
async function withAuthHandler(handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    
    // If not authenticated, return 401
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Continue with handler
    return handler(req, user);
  };
}

// The correct way to implement these route handlers:
export async function GET(req: NextRequest) {
  // Get authenticated user
  const user = await getAuthenticatedUser(req);
  
  // If not authenticated, return 401
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Continue with handler
  return getTutoringSessionsHandler(req, user);
}

export async function POST(req: NextRequest) {
  // Get authenticated user
  const user = await getAuthenticatedUser(req);
  
  // If not authenticated, return 401
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Continue with handler
  return postTutoringSessionsHandler(req, user);
}

export async function PATCH(req: NextRequest) {
  // Get authenticated user
  const user = await getAuthenticatedUser(req);
  
  // If not authenticated, return 401
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Continue with handler
  return patchTutoringSessionsHandler(req, user);
} 