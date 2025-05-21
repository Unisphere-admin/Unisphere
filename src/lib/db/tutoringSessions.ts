import { createServerClient, createRouteHandlerClientWithCookies } from './client';
import { AuthUser, withAuth } from '../auth/protectResource';
import { securityCheck, verifyUserPermission } from './securityUtils';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../types/supabase';

// Define interfaces
export interface TutoringSession {
  id: string;
  created_at: string;
  updated_at: string;
  conversation_id: string;
  message_id: string;
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
 * Create a new tutoring session
 */
async function _createTutoringSession(
  authUser: AuthUser,
  conversationId: string,
  messageId: string,
  tutorId: string,
  studentId: string,
  options?: {
    scheduled_for?: string;
    name?: string;
  }
): Promise<{
  session: TutoringSession | null;
  error: string | null;
  authError?: string;
}> {
  try {
    // Extra security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { session: null, error: null, authError: securityError };
    }
    
    // Verify user is the tutor
    const permissionError = verifyUserPermission(authUser, tutorId);
    if (permissionError) {
      return { session: null, error: permissionError };
    }
    
    // Check if user is actually a tutor - ensure client is awaited
    const client = await createRouteHandlerClientWithCookies();
    
    const { data: userData, error: profileError } = await client
      .from('users')
      .select('is_tutor')
      .eq('id', tutorId)
      .single();
      
    if (profileError) {
      return { session: null, error: 'Failed to verify tutor status' };
    }
    
    if (!userData?.is_tutor) {
      return { session: null, error: 'Only tutors can create tutoring sessions' };
    }
    
    // Prepare session data with required fields
    const sessionData: any = {
        conversation_id: conversationId,
        message_id: messageId,
        tutor_id: tutorId,
        student_id: studentId,
        status: 'requested',
        tutor_ready: false,
        student_ready: false
    };
    
    // Add optional fields if provided
    if (options?.scheduled_for) {
      sessionData.scheduled_for = options.scheduled_for;
    }
    
    if (options?.name) {
      sessionData.name = options.name;
    }
    
    // Create the session
    const { data: session, error: sessionError } = await client
      .from('tutoring_session')
      .insert(sessionData)
      .select()
      .single();
      
    if (sessionError) {
      return { session: null, error: 'Failed to create tutoring session' };
    }
    
    return { session, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { session: null, error: errorMessage };
  }
}

/**
 * Update a tutoring session status
 */
async function _updateSessionStatus(
  authUser: AuthUser,
  sessionId: string,
  status: 'accepted' | 'started' | 'ended' | 'cancelled'
): Promise<{
  session: TutoringSession | null;
  error: string | null;
  authError?: string;
}> {
  try {
    // Extra security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { session: null, error: null, authError: securityError };
    }
    
    // Create the client
    const client = await createRouteHandlerClientWithCookies();
    
    // Get the current session to check permissions
    const { data: existingSession, error: getSessionError } = await client
      .from('tutoring_session')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (getSessionError) {
      return { session: null, error: 'Failed to fetch tutoring session' };
    }
    
    if (!existingSession) {
      return { session: null, error: 'Tutoring session not found' };
    }
    
    // Check if user is either the tutor or student in this session
    if (existingSession.tutor_id !== authUser.id && existingSession.student_id !== authUser.id) {
      return { session: null, error: 'You are not authorized to update this session' };
    }
    
    // Set timestamp fields based on status
    const updates: any = { status, updated_at: new Date().toISOString() };
    
    if (status === 'started' && existingSession.status === 'accepted') {
      updates.started_at = new Date().toISOString();
    }
    
    if (status === 'ended' && existingSession.status === 'started') {
      updates.ended_at = new Date().toISOString();
    }
    
    if (status === 'cancelled') {
      updates.ended_at = new Date().toISOString();
    }
    
    // Update the session
    const { data: updatedSession, error: updateSessionError } = await client
      .from('tutoring_session')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
      
    if (updateSessionError) {
      return { session: null, error: 'Failed to update tutoring session' };
    }
    
    return { session: updatedSession, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { session: null, error: errorMessage };
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
    
    // Check if both users will be ready after this update
    const bothReady = isTutor
      ? (isReady && existingSession.student_ready)
      : (isReady && existingSession.tutor_ready);
    
    // If both users are ready and the session is in 'accepted' status, automatically start it
    if (bothReady && existingSession.status === 'accepted') {
      updateData.status = 'started';
      updateData.started_at = new Date().toISOString();
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
      .order('created_at', { ascending: false });
      
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
    
    const { data, error } = await supabase
      .from('tutoring_session')
      .select(`
        *,
        tutor_profile:tutor_id(first_name, last_name),
        student_profile:student_id(first_name, last_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { error: error.message };
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
        .not('status', 'in', '("cancelled")')
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
        .not('status', 'in', '("cancelled")')
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
 * Create a new tutoring session
 */
export async function createTutoringSession(
  conversationId: string,
  messageId: string,
  tutorId: string,
  studentId: string,
  options: {
    scheduled_for?: string;
    name?: string;
  } = {}
) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    const sessionData = {
      conversation_id: conversationId,
      message_id: messageId,
      tutor_id: tutorId,
      student_id: studentId,
      status: 'requested',
      tutor_ready: false,
      student_ready: false,
      scheduled_for: options.scheduled_for || null,
      name: options.name || null
    };
    
    const { data, error } = await supabase
      .from('tutoring_session')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) {
      return { error: error.message };
    }
    
    return { session: data as TutoringSession };
  } catch (err) {
    return { error: 'Failed to create session' };
  }
}

/**
 * Update a tutoring session's status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled'
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
    
    // Prepare the update data
    const updateData: any = { status };
    
    // Add timestamps for relevant status changes
    if (status === 'started') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'ended') {
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

// Export the authenticated versions
export const createTutoringSessionAuth = withAuth(_createTutoringSession);
export const updateSessionStatusAuth = withAuth(_updateSessionStatus);
export const updateReadyStatusAuth = withAuth(function _updateReadyStatus(authUser: AuthUser, sessionId: string, isReady: boolean) {
  // This is a simple wrapper to forward to our updated function
  return updateReadyStatus(sessionId, isReady);
});
export const getSessionByIdAuth = withAuth(_getSessionById);
export const getSessionsByConversationAuth = withAuth(_getSessionsByConversation); 