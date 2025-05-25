import { createServerClientWithCookies } from './client';

// Define interfaces
export interface TutorBasic {
  id: string;
  search_id: string;
  first_name: string;
  last_name: string;
  description: string;
  avatar_url?: string;
  subjects?: string[];
  major?: string;
}

export interface TutorProfile extends TutorBasic {
  extracurriculars?: string[];
  current_education?: string[];
  previous_education?: string[];
  year?: string;
  "a-levels"?: string[];
  gcse?: string[];
  spm?: string;
}

// Fields for basic listing
const TUTOR_LIST_FIELDS = `
  id, search_id, first_name, last_name, description, avatar_url, subjects, major
`;

// Fields for detailed profile
const TUTOR_DETAIL_FIELDS = `
  id, search_id, avatar_url, first_name, last_name, description, 
  extracurriculars, current_education, subjects, previous_education, 
  year, major, "a-levels", gcse, spm
`;

/**
 * Get a list of all tutors for display on the tutors page
 */
export async function getAllTutors(): Promise<{
  tutors: TutorBasic[];
  error: string | null;
}> {
  try {
    // Create a server client for this request
    const client = await createServerClientWithCookies();
    
    const { data, error } = await client
      .from('tutor_profile')
      .select(TUTOR_LIST_FIELDS)
      .order('first_name', { ascending: true });
      
    if (error) {
      console.error('Error fetching tutors:', error.message);
      return { tutors: [], error: error.message };
    }
    
    // Verify all tutors have search_id
    const missingSearchIds = data?.filter(tutor => !tutor.search_id).length || 0;
    if (missingSearchIds > 0) {
      console.warn(`Warning: ${missingSearchIds} tutors missing search_id`);
    }
    
    return { tutors: data || [], error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error fetching tutors:', errorMessage);
    return { tutors: [], error: errorMessage };
  }
}

/**
 * Get a specific tutor by their search_id
 */
export async function getTutorBySearchId(searchId: string): Promise<{
  tutor: TutorProfile | null;
  error: string | null;
}> {
  try {
    if (!searchId) {
      return { tutor: null, error: 'Search ID is required' };
    }
    
    // Create a server client for this request
    const client = await createServerClientWithCookies();
    
    // Search by search_id only
    const { data, error } = await client
      .from('tutor_profile')
      .select(TUTOR_DETAIL_FIELDS)
      .eq('search_id', searchId)
      .single();
      
    if (error) {
      console.error(`Error fetching tutor with search_id ${searchId}:`, error.message);
      return { tutor: null, error: 'Tutor not found' };
    }
    
    if (!data) {
      return { tutor: null, error: 'Tutor not found' };
    }
    
    return { tutor: data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error fetching tutor profile:', errorMessage);
    return { tutor: null, error: errorMessage };
  }
} 