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
  country?: string | null;
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
  current_education, previous_education, service_costs
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
    
    // Use different fields based on premium access
    const fields = hasPremiumAccess ? TUTOR_LIST_FIELDS : NON_PREMIUM_FIELDS;
    
    const { data, error } = await client
      .from('tutor_profile')
      .select(fields)
      .order('id', { ascending: true });
      
    if (error) {
      return { tutors: [], error: error.message };
    }
    
    // Process data based on premium access
    if (data) {
      let processedTutors;

      if (hasPremiumAccess) {
        // Premium users get full access to tutor data
        processedTutors = data as any as TutorBasic[];
      } else {
        // Non-premium users get limited data with anonymized names
        processedTutors = (data as any as TutorRawData[]).map((tutor, index) => ({
        ...tutor,
          first_name: "T", // First name is "T"
          last_name: (index + 1).toString(), // Last name is a sequential number
        description: "Upgrade to premium to see full tutor details."
      } as TutorBasic));
      }
      
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

    // For non-premium users, anonymize the tutor's name
    if (!hasPremiumAccess) {
      data.first_name = "T";
      data.last_name = generateNumberFromString(data.id || searchId);
      data.description = "Upgrade to premium to see full tutor details.";
    }
    
    return { tutor: data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { tutor: null, error: errorMessage };
  }
} 