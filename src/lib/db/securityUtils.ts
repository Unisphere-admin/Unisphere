import { createRouteHandlerClientWithCookies, createAnonymousClient } from './client';
import { AuthUser } from '../auth/protectResource';

/**
 * Verifies that the user has permission to access/modify the specified data
 * @param authUser The authenticated user
 * @param userId The user ID of the data being accessed/modified
 * @returns An error message if unauthorized, null if authorized
 */
export function verifyUserAccess(
  authUser: AuthUser | null,
  userId: string
): string | null {
  // If no auth user, unauthorized
  if (!authUser) {
    return 'Authentication required';
  }

  // If user IDs don't match, unauthorized
  if (authUser.id !== userId) {
    return 'Not authorized to access or modify this data';
  }

  // Authorization passed
  return null;
}

/**
 * Verifies that the user is a participant in the specified conversation
 * @param authUser The authenticated user
 * @param conversationId The conversation ID
 * @returns Promise resolving to an error message if unauthorized, null if authorized
 */
export async function verifyConversationParticipant(
  authUser: AuthUser | null,
  conversationId: string
): Promise<string | null> {
  // If no auth user, unauthorized
  if (!authUser) {
    return 'Authentication required';
  }

  try {
    // Create a server client using the async version
    const client = await createRouteHandlerClientWithCookies();
    
    // Check if user is a participant - use simplified query
    const { data, error } = await client
      .from('conversation_participant')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', authUser.id)
      .maybeSingle();
      
    if (error || !data) {
      return 'Not authorized to access this conversation';
    }
    
    // Authorization passed
    return null;
  } catch (error) {
    return 'Error verifying authorization';
  }
}

/**
 * Security check for user actions (used by API routes)
 */
export function securityCheck(userId: string): Promise<{ 
  isValid: boolean; 
  error: string | null;
}> {
  return async function() {
    try {
      const supabase = await createRouteHandlerClientWithCookies();
      
      // Check if user is authenticated
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user) {
        return { 
          isValid: false, 
          error: 'Not authenticated' 
        };
      }
      
      // Check if the authenticated user is the same as the requested user
      if (user.id !== userId) {
        return { 
          isValid: false, 
          error: 'Unauthorized access' 
        };
      }
      
      return { 
        isValid: true, 
        error: null 
      };
    } catch (error) {
      console.error('Security check failed:', error);
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Security check failed' 
      };
    }
  }();
}

/**
 * Permission check for user actions
 * @param userId The ID of the user making the request
 * @param targetId The ID of the resource being accessed
 * @param action The action being performed (e.g., "read", "write", "delete")
 * @returns Whether the user has permission
 */
export async function verifyUserPermission(
  userId: string, 
  targetId: string, 
  action: string
): Promise<boolean> {
  try {
    // Admin users have all permissions
    const isAdmin = await checkUserIsAdmin(userId);
    if (isAdmin) {
      return true;
    }
    
    // Users can always access their own data
    if (userId === targetId) {
      return true;
    }
    
    // For tutor profile viewing, anyone can see it (public data)
    if (action === "read_profile") {
      const { isTutor } = await checkUserType(targetId);
      if (isTutor) {
        return true;
      }
    }
    
    // TODO: Implement more granular permission checks if needed
    // For now, default to denying permission for any other case
    return false;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Check if user is an admin
 */
async function checkUserIsAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
}

/**
 * Check user type (tutor or student)
 */
async function checkUserType(userId: string): Promise<{
  isStudent: boolean;
  isTutor: boolean;
}> {
  try {
    // Use anonymous client for public data
    const supabase = createAnonymousClient();
    
    // Check if user is a tutor
    const { data: tutorData, error: tutorError } = await supabase
      .from('tutor_profile')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (tutorData) {
      return { isStudent: false, isTutor: true };
    }
    
    // Check if user is a student
    const { data: studentData, error: studentError } = await supabase
      .from('student_profile')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (studentData) {
      return { isStudent: true, isTutor: false };
    }
    
    // Not found in either table
    return { isStudent: false, isTutor: false };
  } catch (error) {
    console.error('User type check failed:', error);
    return { isStudent: false, isTutor: false };
  }
} 