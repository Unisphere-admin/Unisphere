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
  intended_universities?: string;
  intended_major?: string;
  high_school_subjects?: string[] | string;
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

export async function getUserProfileById(
  userId: string, 
  authUser: AuthUser,
  options?: {
    profile_type?: 'student' | 'tutor';
  }
): Promise<{
  profile: any;
  error: string | null;
}> {
  try {
    // For security, users can only access their own profile unless they have elevated permissions
    if (userId !== authUser.id && !authUser.is_tutor) {  // Assuming tutors can view student profiles
      return { profile: null, error: 'Access denied' };
    }
    
    const supabase = await createRouteHandlerClientWithCookies();
    
    // If profile_type is specified, use that directly without checking user role
    if (options?.profile_type) {
      // For security, only allow tutors to directly request student profiles
      if (options.profile_type === 'student' && !authUser.is_tutor) {
        return { profile: null, error: 'Access denied' };
      }
      
      const profileTable = options.profile_type === 'tutor' ? 'tutor_profile' : 'student_profile';
      
      const { data: profileData, error: profileError } = await supabase
        .from(profileTable)
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error(`Error fetching ${options.profile_type} profile:`, profileError);
        return { profile: null, error: `${options.profile_type} profile not found` };
      }
      
      return { profile: profileData, error: null };
    }
    
    // For regular profile requests, check user role first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_tutor')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return { profile: null, error: 'User not found' };
    }
    
    // Fetch profile based on user role
    const isTutor = userData.is_tutor;
    const profileTable = isTutor ? 'tutor_profile' : 'student_profile';
    
    const { data: profileData, error: profileError } = await supabase
      .from(profileTable)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { profile: null, error: 'Profile not found' };
    }
    
    return { profile: profileData, error: null };
  } catch (error) {
    console.error('Profile fetch error:', error);
    return { profile: null, error: 'Internal server error' };
  }
} 

export async function updateUserProfile(
  userId: string,
  authUser: AuthUser,
  updateData: Record<string, any>
): Promise<{
  profile: any;
  error: string | null;
}> {
  try {
    // For security, users can only update their own profile
    if (userId !== authUser.id) {
      return { profile: null, error: 'Access denied' };
    }
    
    const supabase = await createRouteHandlerClientWithCookies();
    
    // First check if user exists and get their role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_tutor')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return { profile: null, error: 'User not found' };
    }
    
    // Define allowed fields based on role
    const isTutor = userData.is_tutor;
    let profileTable = isTutor ? 'tutor_profile' : 'student_profile';
    let filteredUpdateData: Record<string, any> = {};
    
    // Filter fields based on role
    if (isTutor) {
      // Tutor profile fields that can be updated
      if (updateData.first_name !== undefined) filteredUpdateData.first_name = updateData.first_name;
      if (updateData.last_name !== undefined) filteredUpdateData.last_name = updateData.last_name;
      if (updateData.age !== undefined) filteredUpdateData.age = updateData.age;
      if (updateData.bio !== undefined) filteredUpdateData.description = updateData.bio;
      if (updateData.description !== undefined) filteredUpdateData.description = updateData.description;
      if (updateData.avatar_url !== undefined) filteredUpdateData.avatar_url = updateData.avatar_url;
    } else {
      // Student profile fields that can be updated
      if (updateData.first_name !== undefined) filteredUpdateData.first_name = updateData.first_name;
      if (updateData.last_name !== undefined) filteredUpdateData.last_name = updateData.last_name;
      if (updateData.avatar_url !== undefined) filteredUpdateData.avatar_url = updateData.avatar_url;
      if (updateData.intended_universities !== undefined) filteredUpdateData.intended_universities = updateData.intended_universities;
      if (updateData.intended_major !== undefined) filteredUpdateData.intended_major = updateData.intended_major;
      if (updateData.high_school_subjects !== undefined) filteredUpdateData.high_school_subjects = updateData.high_school_subjects;
      if (updateData.bio !== undefined) filteredUpdateData.bio = updateData.bio;
    }
    
    // Only proceed if there are fields to update
    if (Object.keys(filteredUpdateData).length === 0) {
      return { profile: null, error: 'No valid fields to update' };
    }
    
    // Update the profile
    const { data, error } = await supabase
      .from(profileTable)
      .update(filteredUpdateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return { profile: null, error: 'Failed to update profile' };
    }
    
    return { profile: data, error: null };
  } catch (error) {
    console.error('Profile update error:', error);
    return { profile: null, error: 'Internal server error' };
  }
} 