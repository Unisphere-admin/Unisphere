import { createServerClientWithCookies } from './client';

// Define interfaces
export interface TutorBasic {
  id: string;
  search_id: string;
  first_name: string;
  last_name: string;
  description: string;
  avatar_url?: string;
  subjects?: string[] | string | null;
  major?: string | null;
}

// Interface for raw data with minimal fields
interface TutorRawData {
  id?: string;
  search_id?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  avatar_url?: string;
  subjects?: string[] | string | null;
  major?: string | null;
  current_education?: string | string[] | null;
  previous_education?: string[] | null;
  [key: string]: any; // Allow for other fields
}

export interface TutorProfile extends TutorBasic {
  extracurriculars?: string[] | null;
  current_education?: string | string[] | null;
  previous_education?: string[] | null;
  year?: string | null;
  "a-levels"?: string[] | null;
  gcse?: string[] | null;
  spm?: string[] | string | null;
  ib?: string[] | null;
  service_costs?: Record<string, number> | null;
  cost?: number | null;
  country?: string[] | null;
}

// Fields for basic listing
const TUTOR_LIST_FIELDS = `
  id, search_id, first_name, last_name, description, avatar_url, subjects, major,
  current_education, previous_education, service_costs, country
`;

// Fields for detailed profile
const TUTOR_DETAIL_FIELDS = `
  id, search_id, avatar_url, first_name, last_name, description, 
  extracurriculars, current_education, subjects, previous_education, 
  year, major, "a-levels", gcse, spm, ib, country, service_costs
`;

// Fields for non-premium users (limited information)
const NON_PREMIUM_FIELDS = `
  id, search_id, description, avatar_url, subjects, major,
  current_education, previous_education, service_costs, country
`;

// Function to generate a number from a string (for single tutor lookup)
function generateNumberFromString(input: string): string {
  // Use the sum of character codes to create a number
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  return (sum % 999 + 1).toString(); // Generate a number between 1-999
}

/**
 * Get a list of all tutors for display on the tutors page
 */
export async function getAllTutors(hasPremiumAccess = false): Promise<{
  tutors: TutorBasic[];
  error: string | null;
}> {
  try {
    // Create a server client for this request
    const client = await createServerClientWithCookies();
    
    // Always use full fields - no restrictions on data access
    const fields = TUTOR_LIST_FIELDS;
    
    const { data, error } = await client
      .from('tutor_profile')
      .select(fields)
      .order('id', { ascending: true });
      
    if (error) {
      return { tutors: [], error: error.message };
    }
    
    // Process data - all users get full access to tutor data
    if (data) {
      // Process the raw data to handle arrays properly
      const processedData = data.map((tutor: any) => {
        const processedTutor = { ...tutor };
        
        // No need to process country as it's already a text[] array in PostgreSQL
        
        return processedTutor;
      });
      
      // All users get full access to tutor data
      const processedTutors = processedData as any as TutorBasic[];
      
      return { tutors: processedTutors, error: null };
    }
    
    return { tutors: [], error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { tutors: [], error: errorMessage };
  }
}

/**
 * Get a specific tutor by their search_id
 */
export async function getTutorBySearchId(searchId: string, hasPremiumAccess = false): Promise<{
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
      return { tutor: null, error: 'Tutor not found' };
    }
    
    if (!data) {
      return { tutor: null, error: 'Tutor not found' };
    }

    // Process the data to ensure proper type handling
    let processedData = { ...data };
    
    // No need to process country as it's already a text[] array in PostgreSQL
    
    // All users get full access to tutor data - no anonymization
    return { tutor: processedData as TutorProfile, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { tutor: null, error: errorMessage };
  }
} 