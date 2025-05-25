import { createRouteHandlerClientWithCookies } from './client';
import { createAnonymousClient } from '@/utils/supabase/client';
import { AuthUser } from '../auth/protectResource';

/**
 * Debug flag - only use during development to diagnose auth issues
 */
const DEBUG_BYPASS_SECURITY = false;

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
  // Bypass for debugging
  if (DEBUG_BYPASS_SECURITY) {
    console.log('SECURITY BYPASS: Bypassing user access verification');
    return null;
  }

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
 * @param options Optional parameters for retries
 * @returns Promise resolving to an error message if unauthorized, null if authorized
 */
export async function verifyConversationParticipant(
  authUser: AuthUser | null,
  conversationId: string,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    currentRetry?: number;
  }
): Promise<string | null> {
  // Bypass for debugging
  if (DEBUG_BYPASS_SECURITY) {
    console.log('SECURITY BYPASS: Bypassing conversation participant verification');
    return null;
  }

  // If no auth user, unauthorized
  if (!authUser) {
    return 'Authentication required';
  }
  
  // Allow access for tutors or users with premium access without requiring them to be participants
  // This ensures premium users can access any conversation
  if (authUser.is_tutor || authUser.has_access) {
    console.log(`Bypassing participant check for user ${authUser.id} with premium access or tutor status`);
    return null;
  }
  
  // Setup retry parameters
  const maxRetries = options?.maxRetries || 3;
  const initialRetryDelay = options?.retryDelay || 250; // ms
  const currentRetry = options?.currentRetry || 0;

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
      // If still within retry attempts, wait and try again with exponential backoff
      if (currentRetry < maxRetries) {
        const nextRetryDelay = initialRetryDelay * Math.pow(2, currentRetry);
        console.log(`Retry ${currentRetry + 1}/${maxRetries} for conversation participant check in ${nextRetryDelay}ms`);
        
        // Wait for the calculated delay
        await new Promise(resolve => setTimeout(resolve, nextRetryDelay));
        
        // Retry with incremented retry counter
        return await verifyConversationParticipant(authUser, conversationId, {
          maxRetries,
          retryDelay: initialRetryDelay,
          currentRetry: currentRetry + 1
        });
      }
      
      console.error(`User ${authUser.id} is not a participant in conversation ${conversationId} after ${maxRetries} retries`);
      return 'Not authorized to access this conversation';
    }
    
    // Authorization passed
    return null;
  } catch (error) {
    console.error("Error checking conversation participant:", error);
    return 'Error verifying conversation access';
  }
}

/**
 * Basic security check for authenticated users
 */
export function securityCheck(authUser: AuthUser): string | null {
  // Bypass for debugging
  if (DEBUG_BYPASS_SECURITY) {
    console.log('SECURITY BYPASS: Bypassing basic security check');
    return null;
  }

  if (!authUser) {
    console.error('Authentication check failed: No auth user provided');
    return "Authentication required";
  }

  if (!authUser.id) {
    console.error('Authentication check failed: Auth user has no ID');
    return "Invalid authentication data";
  }

  console.log(`Security check passed for user: ${authUser.id}`);
  return null;
}

/**
 * Verifies if a user has permission to operate on a target user's resources
 */
export async function verifyUserPermission(
  authUser: AuthUser, 
  targetId: string
): Promise<string | null> {
  // Bypass for debugging
  if (DEBUG_BYPASS_SECURITY) {
    console.log('SECURITY BYPASS: Bypassing user permission verification');
      return null;
    }
    
  // Check for basic security requirements
  const securityError = securityCheck(authUser);
  if (securityError) return securityError;
  
  // Users can only access their own resources, unless they're an admin
  if (authUser.id !== targetId) {
    const isAdmin = await checkUserIsAdmin(authUser.id);
    
    if (!isAdmin) {
      console.error(`Permission denied: User ${authUser.id} attempted to access resources for ${targetId}`);
      return "Not authorized to access this resource";
    }
  }
  
  return null;
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