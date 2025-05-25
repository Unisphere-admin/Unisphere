import { createRouteHandlerClientWithCookies } from './client';
import { createAnonymousClient } from '@/utils/supabase/client';
import { AuthUser, withAuth } from '../auth/protectResource';
import { securityCheck, verifyUserPermission } from './securityUtils';

// Define interfaces
export interface UserBasic {
  id: string;
  email: string;
  is_tutor: boolean;
}

export interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar_url?: string;
  is_tutor: boolean;
  tokens?: number;
  subjects?: string;
  has_access?: boolean;
}

// Fields for basic user info
const USER_BASIC_FIELDS = `
  id, email, is_tutor
`;

/**
 * Search for users based on query
 */
async function _searchUsers(authUser: AuthUser, query: string): Promise<{
  users: UserBasic[];
  error: string | null;
}> {
  try {
    // Extra security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { users: [], error: securityError };
    }
    
    if (!query || query.trim().length < 2) {
      return { users: [], error: null }; // Return empty array for very short queries
    }
    
    // Create a server client for this request
    const client = await createRouteHandlerClientWithCookies();
    
    // Search across users
    const { data, error } = await client
      .from('users')
      .select(USER_BASIC_FIELDS)
      .ilike('email', `%${query}%`)
      .limit(20);
      
    if (error) {
      console.error('Error searching users:', error.message);
      return { users: [], error: error.message };
    }
    
    return { users: data || [], error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error searching users:', errorMessage);
    return { users: [], error: errorMessage };
  }
}

// Export the authenticated version
export const searchUsers = withAuth(_searchUsers);

/**
 * Get a user by ID
 */
async function _getUserById(authUser: AuthUser, userId: string): Promise<{
  user: UserProfile | null;
  error: string | null;
}> {
  try {
    // Extra security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { user: null, error: securityError };
    }
    
    if (!userId) {
      return { user: null, error: 'User ID is required' };
    }
    
    // Only allow users to access their own profiles, unless they're an admin
    // (You could add a check for admin role here)
    if (authUser.id !== userId) {
      // Only allow basic info to be returned for other users
      return await getPublicUserById(userId);
    }
    
    // Create a server client for this request
    const client = await createRouteHandlerClientWithCookies();
    
    // Get user data
    const { data, error } = await client
      .from('users')
      .select('id, email, is_tutor, created_at, last_sign_in, email_confirmed_at')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error(`Error fetching user with ID ${userId}:`, error.message);
      return { user: null, error: 'User not found' };
    }
    
    return { user: data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error fetching user:', errorMessage);
    return { user: null, error: errorMessage };
  }
}

// Export the authenticated version
export const getUserById = withAuth(_getUserById);

/**
 * Get the user profile for the current user or a specific user ID
 * @param userId User ID to fetch profile for
 * @param currentUser The currently authenticated user (for permission checking)
 */
export async function getUserProfile(
  userId: string,
  currentUser?: AuthUser
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    // Use currentUser to properly handle permissions
    const supabase = await createRouteHandlerClientWithCookies();
    
    // If the client is not properly initialized 
    if (supabase.from && typeof supabase.from !== 'function') {
      console.error('Invalid Supabase client for user profile');
      return { user: null, error: 'Database client error' };
    }
    
    // If requesting another user's profile, do permission check
    if (currentUser && userId !== currentUser.id) {
      const permissionError = await verifyUserPermission(currentUser, userId);
      if (permissionError) {
        return { user: null, error: 'Permission denied' };
      }
    }
    
    try {
      // First get the main user data that includes tokens
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, is_tutor, tokens, has_access')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        return { user: null, error: 'Failed to fetch user data' };
      }
      
      // Now check if user is a tutor
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutor_profile')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (tutorData) {
        // User is a tutor
        return { 
          user: { 
            ...tutorData,
            tokens: userData?.tokens || 0,
            has_access: userData?.has_access || false,
            is_tutor: true 
          }, 
          error: null 
        };
      }
      
      // If not a tutor, check student profiles
      const { data: studentData, error: studentError } = await supabase
        .from('student_profile')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (studentData) {
        // User is a student
        return { 
          user: { 
            ...studentData,
            tokens: userData?.tokens || 0,
            has_access: userData?.has_access || false,
            is_tutor: false 
          }, 
          error: null 
        };
      }
      
      // If not found in either table, user profile doesn't exist
      return { 
        user: userData ? { 
          ...userData,
          has_access: userData.has_access || false,
          is_tutor: userData.is_tutor || false 
        } : null, 
        error: userData ? null : 'User profile not found' 
      };
    } catch (dbError) {
      console.error('Error executing Supabase query for user profile:', dbError);
      return { user: null, error: 'Database query error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching user profile';
    console.error('Failed to get user profile:', errorMessage);
    return { user: null, error: errorMessage };
  }
}

/**
 * Check if a user exists and what type they are (tutor or student)
 * This is a public route that doesn't require authentication
 */
export async function checkUserExists(userId: string): Promise<{ 
  exists: boolean; 
  isStudent: boolean;
  isTutor: boolean;
  error: string | null;
}> {
  try {
    const supabase = createAnonymousClient();
    
    // Check tutor profiles
    const { data: tutorProfile, error: tutorError } = await supabase
      .from('tutor_profile')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (tutorProfile) {
      return { exists: true, isStudent: false, isTutor: true, error: null };
    }
    
    // Check student profiles
    const { data: studentProfile, error: studentError } = await supabase
      .from('student_profile')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (studentProfile) {
      return { exists: true, isStudent: true, isTutor: false, error: null };
    }
    
    // Not found in either table
    return { exists: false, isStudent: false, isTutor: false, error: 'User not found' };
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return { 
      exists: false, 
      isStudent: false, 
      isTutor: false, 
      error: error instanceof Error ? error.message : 'Unknown error checking user' 
    };
  }
}

/**
 * Get public user by ID
 */
export async function getPublicUserById(userId: string): Promise<{
  user: UserProfile | null;
  error: string | null;
}> {
  try {
    if (!userId) {
      return { user: null, error: 'User ID is required' };
    }
    
    // Create a server client for this request
    const client = await createRouteHandlerClientWithCookies();
    
    // Get user data with limited public fields
    const { data, error } = await client
      .from('users')
      .select('id, email, is_tutor')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error(`Error fetching user with ID ${userId}:`, error.message);
      return { user: null, error: 'User not found' };
    }
    
    return { user: data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error fetching user:', errorMessage);
    return { user: null, error: errorMessage };
  }
} 

/**
 * Create a user profile if one doesn't exist
 * This should be called after the user is authenticated
 */
export async function createUserProfileIfNeeded(
  userId: string,
  userData: { 
    is_tutor: boolean;
    first_name?: string;
    last_name?: string;
    email?: string;
  }
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Create a server client for this request
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Check if profile already exists
    const { exists, isStudent, isTutor } = await checkUserExists(userId);
    
    // If profile exists, nothing to do
    if (exists) {
      return { success: true, error: null };
    }
    
    // Otherwise, create the appropriate profile
    if (userData.is_tutor) {
      // For tutors, we create a minimal profile
      // They'll complete the rest of their profile in the onboarding flow
      const { error } = await supabase
        .from('tutor_profile')
        .insert({
          id: userId,
          first_name: userData.first_name || userData.email?.split('@')[0] || 'Tutor',
          last_name: userData.last_name || '',
          description: ''
        });
      
      if (error) {
        // Duplicate key violation (23505) should be treated as a success
        // This can happen due to race conditions when profile is created in parallel
        if (error.code === '23505') {
          console.log(`Tutor profile already exists for ${userId}, ignoring duplicate insertion`);
          return { success: true, error: null };
        }
        
        console.error('Error creating tutor profile:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create student profile
      const { error } = await supabase
        .from('student_profile')
        .insert({
          id: userId,
          first_name: userData.first_name || userData.email?.split('@')[0] || 'Student',
          last_name: userData.last_name || ''
        });
      
      if (error) {
        // Duplicate key violation (23505) should be treated as a success
        // This can happen due to race conditions when profile is created in parallel
        if (error.code === '23505') {
          console.log(`Student profile already exists for ${userId}, ignoring duplicate insertion`);
          return { success: true, error: null };
        }
        
        console.error('Error creating student profile:', error);
        return { success: false, error: error.message };
      }
    }
    
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error creating user profile:', errorMessage);
    return { success: false, error: errorMessage };
  }
} 