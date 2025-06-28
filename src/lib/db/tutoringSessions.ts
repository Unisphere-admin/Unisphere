import { createRouteHandlerClientWithCookies } from './client';
import { AuthUser, withAuth } from '../auth/protectResource';
import { securityCheck, verifyUserPermission } from './securityUtils';
import { Database } from '../types/supabase';
import { getUserProfile } from './users';

// Define interfaces
export interface TutoringSession {
  id: string;
  created_at: string;
  updated_at: string;
  conversation_id: string;
  // message_id is completely optional - sessions can be created without an associated message
  // created_at is used for ordering sessions instead of display_order or message_id
  message_id?: string | null;
  tutor_id: string;
  student_id: string;
  status: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled';
  tutor_ready: boolean;
  student_ready: boolean;
  started_at: string | null;
  ended_at: string | null;
  scheduled_for: string | null;
  name: string | null;
  tutor_profile?: {
    first_name: string;
    last_name: string;
  };
  student_profile?: {
    first_name: string;
    last_name: string;
  };
}

/**
 * Create a new tutoring session request (for students)
 */
async function _createTutoringSessionRequest(
  authUser: AuthUser,
  conversationId: string,
  tutorId: string,
  studentId: string,
  options?: {
    scheduled_for?: string;
    name?: string;
    message_id?: string;
  },
  studentTokens?: number
): Promise<{
  session: TutoringSession | null;
  error: string | null;
  authError?: string;
}> {
  if (!authUser || authUser.id !== tutorId) {
    return {
      session: null,
      error: null,
      authError: 'Not authorized to create tutoring session request'
    };
  }
  
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Prepare session data
    const sessionData: any = {
      conversation_id: conversationId,
      tutor_id: tutorId,
      student_id: studentId,
      status: 'requested',
      tutor_ready: false,
      student_ready: false
    };
    
    // Add optional fields
    if (options?.scheduled_for) sessionData.scheduled_for = options.scheduled_for;
    if (options?.name) sessionData.name = options.name;
    if (options?.message_id) sessionData.message_id = options.message_id;
    
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
      return {
        session: null,
        error: `Failed to create tutoring session request: ${sessionError.message}`
      };
    }
    
    return {
      session,
      error: null
    };
  } catch (error) {
    return {
      session: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Create a new tutoring session
 */
async function _createTutoringSession(
  authUser: AuthUser,
  conversationId: string,
  tutorId: string,
  studentId: string,
  options?: {
    scheduled_for?: string;
    name?: string;
    message_id?: string;
  },
  studentTokens?: number
): Promise<{
  session: TutoringSession | null;
  error: string | null;
  authError?: string;
}> {
  if (!authUser || authUser.id !== tutorId) {
    return {
      session: null,
      error: null,
      authError: 'Not authorized to create tutoring session'
    };
  }
  
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Check tokens if provided
    if (typeof studentTokens === 'number' && studentTokens < 1) {
      return {
        session: null,
        error: 'Insufficient tokens for session'
      };
    }
    
    // Prepare session data
    const sessionData: any = {
      conversation_id: conversationId,
      tutor_id: tutorId,
      student_id: studentId,
      status: 'accepted',
      tutor_ready: false,
      student_ready: false
    };
    
    // Add optional fields
    if (options?.scheduled_for) sessionData.scheduled_for = options.scheduled_for;
    if (options?.name) sessionData.name = options.name;
    if (options?.message_id) sessionData.message_id = options.message_id;
    
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
      return {
        session: null,
        error: `Failed to create tutoring session: ${sessionError.message}`
      };
    }
    
    return {
      session,
      error: null
    };
  } catch (error) {
    return {
      session: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Update a tutoring session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled',
  studentTokens?: number
) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // First get the session to make sure it exists
    const { data: existingSession, error: fetchError } = await supabase
      .from('tutoring_session')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (fetchError) {
      return { error: 'Session not found' };
    }
    
    // If changing to accepted status, verify student has enough tokens
    if (status === 'accepted' && existingSession.status === 'requested') {
      if (studentTokens !== undefined) {
        if (studentTokens <= 0) {
          return { error: 'Student does not have enough tokens for this session' };
        }
      }
      // No need for an else case here as token check should happen in the API route
    }
    
    // Prepare the update data
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString() 
    };
    
    // Add timestamps for relevant status changes
    if (status === 'accepted' && existingSession.status === 'requested') {
      // No specific timestamp needed for accepting a request
    } else if (status === 'started') {
      // Set started_at timestamp if not already set
      if (!existingSession.started_at) {
      updateData.started_at = new Date().toISOString();
      }
    } else if (status === 'ended') {
      // Always set ended_at timestamp when ending a session
      updateData.ended_at = new Date().toISOString();
    }
    
    // Update the session
    const { data, error } = await supabase
      .from('tutoring_session')
      .update(updateData)
      .eq('id', sessionId)
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .single();
    
    if (error) {
      return { error: error.message };
    }
    
    return { session: data as TutoringSession };
  } catch (err) {
    return { error: 'Failed to update session status' };
  }
}

/**
 * Update a tutoring session's ready status
 */
export async function updateReadyStatus(
  sessionId: string,
  isReady: boolean
) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { authError: 'Authentication required' };
    }
    
    // First get the session to determine if user is tutor or student
    const { data: existingSession, error: fetchError } = await supabase
      .from('tutoring_session')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (fetchError) {
      return { error: 'Session not found' };
    }
    
    // Determine which field to update based on the user's role
    const isTutor = existingSession.tutor_id === user.id;
    const updateData: any = isTutor
      ? { tutor_ready: isReady }
      : { student_ready: isReady };
    
    // Update the session
    const { data, error } = await supabase
      .from('tutoring_session')
      .update(updateData)
      .eq('id', sessionId)
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .single();
    
    if (error) {
      return { error: error.message };
    }
    
    return { session: data as TutoringSession };
  } catch (err) {
    return { error: 'Failed to update ready status' };
  }
}

/**
 * Get session by ID
 */
async function _getSessionById(
  authUser: AuthUser,
  sessionId: string
): Promise<{
  session: TutoringSession | null;
  error: string | null;
  authError?: string;
}> {
  try {
    // Extra security check
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { session: null, error: null, authError: securityError };
    }
    
    // Create the client
    const client = await createRouteHandlerClientWithCookies();
    
    // Get the session
    const { data: session, error: sessionError } = await client
      .from('tutoring_session')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (sessionError) {
      return { session: null, error: 'Failed to fetch tutoring session' };
    }
    
    if (!session) {
      return { session: null, error: 'Tutoring session not found' };
    }
    
    // Check if user is the tutor or student
    if (session.tutor_id !== authUser.id && session.student_id !== authUser.id) {
      return { session: null, error: 'You are not authorized to view this session' };
    }
    
    return { session, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { session: null, error: errorMessage };
  }
}

/**
 * Get sessions for a conversation
 */
async function _getSessionsByConversation(
  authUser: AuthUser,
  conversationId: string
): Promise<{
  sessions: TutoringSession[];
  error: string | null;
  authError?: string;
}> {
  try {
    // Extra security check
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { sessions: [], error: null, authError: securityError };
    }
    
    // Create the client
    const client = await createRouteHandlerClientWithCookies();
    
    // Get the sessions
    const { data: sessions, error: sessionsError } = await client
      .from('tutoring_session')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
      
    if (sessionsError) {
      return { sessions: [], error: 'Failed to fetch tutoring sessions' };
    }
    
    return { sessions: sessions || [], error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { sessions: [], error: errorMessage };
  }
}

/**
 * Get a specific tutoring session by its ID
 */
export async function getSessionById(sessionId: string) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    const { data, error } = await supabase
      .from('tutoring_session')
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .eq('id', sessionId)
      .single();
      
    if (error) {
      return { error: error.message };
    }
    
    return { session: data as TutoringSession };
  } catch (err) {
    return { error: 'Failed to get session' };
  }
}

/**
 * Get all tutoring sessions for a conversation
 */
export async function getSessionsByConversation(conversationId: string) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Log that we're fetching sessions, including cancelled ones
    
    const { data, error } = await supabase
      .from('tutoring_session')
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
      
    if (error) {
      return { error: error.message };
    }
    
    // Log the sessions found, specifically highlighting cancelled ones
    if (data && data.length > 0) {
      const cancelledSessions = data.filter(s => s.status === 'cancelled');
    }
    
    return { sessions: data as TutoringSession[] };
  } catch (err) {
    return { error: 'Failed to get sessions' };
  }
}

/**
 * Get all user's tutoring sessions
 */
export async function getUserSessions(userId: string, userType: 'tutor' | 'student') {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    let query;
    if (userType === 'tutor') {
      query = supabase
        .from('tutoring_session')
        .select(`
          *,
          student_profile:student_id(first_name, last_name)
        `)
        .eq('tutor_id', userId)
        .not('scheduled_for', 'is', null)
        .order('scheduled_for', { ascending: true });
    } else {
      query = supabase
        .from('tutoring_session')
        .select(`
          *,
          tutor_profile:tutor_id(first_name, last_name)
        `)
        .eq('student_id', userId)
        .not('scheduled_for', 'is', null)
        .order('scheduled_for', { ascending: true });
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { error: error.message };
    }
    
    return { sessions: data as TutoringSession[] };
  } catch (err) {
    return { error: 'Failed to get user sessions' };
  }
}

/**
 * Create a tutoring session request (for both tutors and students)
 */
export const createTutoringSessionRequestAuth = withAuth(function _createTutoringSessionRequestWrapped(
  authUser: AuthUser, 
  conversationId: string, 
  tutorId: string, 
  studentId: string, 
  options: { 
    scheduled_for?: string; 
    name?: string; 
    message_id?: string;
  } = {},
  studentTokens?: number
) {
  return _createTutoringSessionRequest(authUser, conversationId, tutorId, studentId, options, studentTokens);
});

/**
 * Create a tutoring session (for tutors)
 */
export const createTutoringSessionAuth = withAuth(function _createTutoringSessionWrapped(
  authUser: AuthUser, 
  conversationId: string, 
  tutorId: string, 
  studentId: string, 
  options: { 
    scheduled_for?: string; 
    name?: string; 
    message_id?: string;
  } = {},
  studentTokens?: number
) {
  return _createTutoringSession(authUser, conversationId, tutorId, studentId, options, studentTokens);
});

/**
 * Client-side function for creating tutoring sessions (for tutors)
 */
export async function createTutoringSession(
  user: AuthUser,
  conversationId: string,
  tutorId: string,
  studentId: string,
  options: {
    scheduled_for?: string;
    name?: string;
    message_id?: string;
  } = {},
  studentTokens?: number
) {
  try {
    
    // Simply pass through to the authenticated handler
    return _createTutoringSession(
      user,
      conversationId,
      tutorId,
      studentId,
      options,
      studentTokens
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { session: null, error: errorMessage };
  }
}

/**
 * Client-side function for creating tutoring session requests (for both tutors and students)
 */
export async function createTutoringSessionRequest(
  user: AuthUser,
  conversationId: string,
  tutorId: string,
  studentId: string,
  options: {
    scheduled_for?: string;
    name?: string;
    message_id?: string;
  } = {},
  studentTokens?: number
) {
  try {
    
    // Check if user is a tutor
    if (!user.is_tutor) {
      return { session: null, error: 'Only tutors can create tutoring sessions' };
    }
    
    // Simply pass through to the authenticated handler
    return _createTutoringSessionRequest(
      user,
      conversationId,
      tutorId,
      studentId,
      options,
      studentTokens
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { session: null, error: errorMessage };
  }
}

// Export the authenticated versions
export const updateSessionStatusAuth = withAuth(async function _updateSessionStatusWithAuth(
  authUser: AuthUser, 
  sessionId: string, 
  status: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled',
  studentTokens?: number
) {
  // Security check
  const securityError = securityCheck(authUser);
  if (securityError) {
    return { session: null, error: null, authError: securityError };
  }

  const client = await createRouteHandlerClientWithCookies();

  // Get the session to verify participants and student ID
  const { data: existingSession, error: fetchError } = await client
    .from('tutoring_session')
    .select('id, student_id, tutor_id, status, conversation_id')
    .eq('id', sessionId)
    .single();

  if (fetchError || !existingSession) {
    return { session: null, error: 'Session not found' };
  }

  // If accepting the session, check student's tokens
  if (status === 'accepted') {
    // Allow either student or tutor to accept session
    if (authUser.id !== existingSession.tutor_id && authUser.id !== existingSession.student_id) {
      return { session: null, error: "Only session participants can accept this session."};
    }
    
    // Check student tokens with provided value or fetch if needed
    if (authUser.id === existingSession.student_id || studentTokens !== undefined) {
      // Student is accepting or we're checking student tokens
      const tokensToCheck = studentTokens !== undefined ? studentTokens : authUser.tokens;
      
      if (tokensToCheck === undefined || tokensToCheck <= 0) {
        return { session: null, error: "Student does not have enough tokens for this session." };
      }
    } else {
      // Tutor is accepting, check student tokens
    const { user: studentProfile, error: studentProfileError } = await getUserProfile(existingSession.student_id);
    if (studentProfileError || !studentProfile) {
      return { session: null, error: "Could not retrieve student profile to check tokens." };
    }
    if (!studentProfile.tokens || studentProfile.tokens <= 0) {
        return { session: null, error: "Student does not have enough tokens for this session." };
      }
    }
  } else if (status === 'cancelled') {
      // Allow either tutor or student to cancel
      if (authUser.id !== existingSession.tutor_id && authUser.id !== existingSession.student_id) {
          return { session: null, error: "Only session participants can cancel the session."};
      }
  } else if (status === 'started') {
    // Only tutor can start
     if (authUser.id !== existingSession.tutor_id) {
          return { session: null, error: "Only the tutor can start the session."};
      }
  } else if (status === 'ended') {
    // Only tutor can end
     if (authUser.id !== existingSession.tutor_id) {
          return { session: null, error: "Only the tutor can end the session. Students are not permitted to end sessions."};
      }
  }

  // Prepare the update data with status change
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString() 
  };
  
  // Add timestamps for relevant status changes
  if (status === 'started' && existingSession.status !== 'started') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'ended' && existingSession.status !== 'ended') {
    updateData.ended_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('tutoring_session')
    .update(updateData)
    .eq('id', sessionId)
    .select(`
      *,
      tutor_profile:tutor_id(first_name, last_name),
      student_profile:student_id(first_name, last_name)
    `)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { session: data as TutoringSession };
});
export const updateReadyStatusAuth = withAuth(function _updateReadyStatus(authUser: AuthUser, sessionId: string, isReady: boolean) {
  // This is a simple wrapper to forward to our updated function
  return updateReadyStatus(sessionId, isReady);
});
export const getSessionByIdAuth = withAuth(_getSessionById);
export const getSessionsByConversationAuth = withAuth(_getSessionsByConversation); 

/**
 * Get tutoring sessions by message ID
 * This function now primarily uses conversation_id and timestamps to find related sessions,
 * since message_id is now completely optional
 */
export async function getSessionsByMessageId(messageId: string) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Get the message to find its conversation_id
    const { data: messageData, error: messageError } = await supabase
      .from('message')
      .select('conversation_id, created_at')
      .eq('id', messageId)
      .single();
    
    if (messageError || !messageData) {
      return { sessions: [], error: 'Message not found' };
    }
    
    const conversationId = messageData.conversation_id;
    const messageTimestamp = messageData.created_at;
    
    if (!messageTimestamp) {
      return { sessions: [], error: 'Message timestamp not found' };
    }
    
    // Create a time window around the message (10 seconds before and after)
    // This helps find sessions created around the same time as the message
    const timeWindowStart = new Date(new Date(messageTimestamp).getTime() - 10000).toISOString();
    const timeWindowEnd = new Date(new Date(messageTimestamp).getTime() + 10000).toISOString();
    
    // Look for sessions in this conversation with:
    // 1. Explicitly attached to this message_id (for backward compatibility)
    // 2. OR created within a time window around the message
    const { data: sessions, error } = await supabase
      .from('tutoring_session')
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .eq('conversation_id', conversationId)
      .or(`message_id.eq.${messageId},and(created_at.gte.${timeWindowStart},created_at.lte.${timeWindowEnd})`)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { sessions: [], error: error.message };
    }
    
    return { sessions: sessions || [], error: null };
  } catch (error) {
    return { 
      sessions: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 