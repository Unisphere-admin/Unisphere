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
  
  // Student profile fields
  intended_universities?: string;
  intended_major?: string;
  current_subjects?: string[] | string;
  year?: string;
  school_name?: string;
  previous_schools?: string[] | string;
  age?: string;
  
  // Examination records
  a_levels?: any[];
  ib_diploma?: any[];
  igcse?: any[];
  spm?: any[];
  
  // Activities and achievements
  extracurricular_activities?: any[];
  awards?: any[];
  
  // University planning fields
  application_cycle?: string;
  countries_to_apply?: string;
  universities_to_apply?: string;
  planned_admissions_tests?: string;
  completed_admissions_tests?: string;
  planned_admissions_support?: string;
  university_other_info?: string;
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
      return { users: [], error: error.message };
    }
    
    return { users: data || [], error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
      return { user: null, error: 'User not found' };
    }
    
    return { user: data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
      return { user: null, error: 'Database query error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching user profile';
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
      return { user: null, error: 'User not found' };
    }
    
    return { user: data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
          return { success: true, error: null };
        }
        
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
          return { success: true, error: null };
        }
        
        return { success: false, error: error.message };
      }
    }
    
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
      return { profile: null, error: 'Profile not found' };
    }
    
    return { profile: profileData, error: null };
  } catch (error) {
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
      
    if (userError) {
      console.error('Error fetching user role:', userError);
      return { profile: null, error: 'User not found' };
    }
    
    if (!userData) {
      return { profile: null, error: 'User not found' };
    }
    
    // Define allowed fields based on role
    const isTutor = userData.is_tutor;
    let profileTable = isTutor ? 'tutor_profile' : 'student_profile';
    let filteredUpdateData: Record<string, any> = {};
    
    // Detailed logging
    console.log('Processing update for', isTutor ? 'tutor' : 'student', 'profile');
    
    // Filter fields based on role
    if (isTutor) {
      // Tutor profile fields that can be updated
      if (updateData.first_name !== undefined) filteredUpdateData.first_name = updateData.first_name;
      if (updateData.last_name !== undefined) filteredUpdateData.last_name = updateData.last_name;
      if (updateData.age !== undefined) filteredUpdateData.age = updateData.age;
      if (updateData.cost !== undefined) filteredUpdateData.cost = updateData.cost;
      if (updateData.service_costs !== undefined) {
        filteredUpdateData.service_costs = safeJSONField(updateData.service_costs);
      }
      if (updateData.bio !== undefined) filteredUpdateData.description = updateData.bio;
      if (updateData.description !== undefined) filteredUpdateData.description = updateData.description;
      if (updateData.avatar_url !== undefined) filteredUpdateData.avatar_url = updateData.avatar_url;
      if (updateData.subjects !== undefined) filteredUpdateData.subjects = updateData.subjects;
    } else {
      // Student profile fields that can be updated
      try {
        // Basic fields
        if (updateData.first_name !== undefined) filteredUpdateData.first_name = updateData.first_name;
        if (updateData.last_name !== undefined) filteredUpdateData.last_name = updateData.last_name;
        if (updateData.avatar_url !== undefined) filteredUpdateData.avatar_url = updateData.avatar_url;
        if (updateData.intended_universities !== undefined) filteredUpdateData.intended_universities = updateData.intended_universities;
        if (updateData.intended_major !== undefined) filteredUpdateData.intended_major = updateData.intended_major;
        if (updateData.high_school_subjects !== undefined) filteredUpdateData.current_subjects = updateData.high_school_subjects;
        if (updateData.current_subjects !== undefined) filteredUpdateData.current_subjects = updateData.current_subjects;
        if (updateData.bio !== undefined) filteredUpdateData.bio = updateData.bio;
        
        // Process JSON fields with detailed logging
        
        // New examination record fields
        if (updateData.a_levels !== undefined) {
          filteredUpdateData.a_levels = safeJSONField(updateData.a_levels);
        }
        
        if (updateData.ib_diploma !== undefined) {
          filteredUpdateData.ib_diploma = safeJSONField(updateData.ib_diploma);
        }
        
        if (updateData.igcse !== undefined) {
          filteredUpdateData.igcse = safeJSONField(updateData.igcse);
        }
        
        if (updateData.spm !== undefined) {
          filteredUpdateData.spm = safeJSONField(updateData.spm);
        }
        
        // Extracurricular activities and awards
        if (updateData.extracurricular_activities !== undefined) {
          filteredUpdateData.extracurricular_activities = safeJSONField(updateData.extracurricular_activities);
        }
        
        if (updateData.awards !== undefined) {
          filteredUpdateData.awards = safeJSONField(updateData.awards);
        }
        
        // University planning fields
        if (updateData.application_cycle !== undefined) filteredUpdateData.application_cycle = updateData.application_cycle;
        if (updateData.countries_to_apply !== undefined) filteredUpdateData.countries_to_apply = updateData.countries_to_apply;
        if (updateData.universities_to_apply !== undefined) filteredUpdateData.universities_to_apply = updateData.universities_to_apply;
        if (updateData.planned_admissions_tests !== undefined) filteredUpdateData.planned_admissions_tests = updateData.planned_admissions_tests;
        if (updateData.completed_admissions_tests !== undefined) filteredUpdateData.completed_admissions_tests = updateData.completed_admissions_tests;
        if (updateData.planned_admissions_support !== undefined) filteredUpdateData.planned_admissions_support = updateData.planned_admissions_support;
        if (updateData.university_other_info !== undefined) filteredUpdateData.university_other_info = updateData.university_other_info;
        
        // Other student fields
        if (updateData.age !== undefined) filteredUpdateData.age = updateData.age;
        if (updateData.year !== undefined) filteredUpdateData.year = updateData.year;
        if (updateData.school_name !== undefined) filteredUpdateData.school_name = updateData.school_name;
        if (updateData.previous_schools !== undefined) filteredUpdateData.previous_schools = updateData.previous_schools;
      } catch (error) {
        console.error('Error processing student profile fields:', error);
        return { profile: null, error: `Error processing fields: ${error instanceof Error ? error.message : String(error)}` };
      }
    }
    
    // Only proceed if there are fields to update
    if (Object.keys(filteredUpdateData).length === 0) {
      return { profile: null, error: 'No valid fields to update' };
    }
    
    // Log the final filtered data
    console.log('Sending update to database:', JSON.stringify(filteredUpdateData, null, 2));
    console.log('Table being updated:', profileTable);
    
    // Update the profile
    const { data, error } = await supabase
      .from(profileTable)
      .update(filteredUpdateData)
      .eq('id', userId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Database error when updating profile:', error);
      return { profile: null, error: `Database error: ${error.message}` };
    }
    
    console.log('Database update successful. Updated profile:', data);
    return { profile: data, error: null };
  } catch (error) {
    console.error('Uncaught error in updateUserProfile:', error);
    return { profile: null, error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` };
  }
} 

// Safely handle JSONB field - returns null for empty/invalid data
const safeJSONField = (data: any): any | null => {
  if (data === null || data === undefined) return null;
  
  // If it's a string, try to parse it
  if (typeof data === 'string') {
    if (data.trim() === '') return null;
    try {
      const parsed = JSON.parse(data);
      // Return null for empty arrays
      if (Array.isArray(parsed) && parsed.length === 0) return null;
      return parsed;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return null;
    }
  }
  
  // If it's already an array, check if it's empty
  if (Array.isArray(data) && data.length === 0) return null;
  
  return data;
}; 