import { createRouteHandlerClientWithCookies, createAnonymousClient } from './client';
import { securityCheck, verifyUserPermission } from './securityUtils';
import { AuthUser } from '../auth/protectResource';

// Review interface
export interface Review {
  id: number;
  created_at: string;
  review: string | null;
  tutor_id: string;
  rating: number;
  student_id?: string;
  student_name?: string;
}

/**
 * Create a new review for a tutor
 */
export async function createReview(
  studentId: string,
  tutorId: string,
  rating: number,
  reviewText?: string
) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    const reviewData = {
      tutor_id: tutorId,
      student_id: studentId,
      rating,
      review: reviewText || null
    };
    
    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();
    
    if (error) {
      return { error: error.message };
    }
    
    return { review: data as Review };
  } catch (err) {
    return { error: 'Failed to create review' };
  }
}

/**
 * Get reviews for a specific tutor - public data, no auth required
 */
export async function getTutorReviews(tutorId: string) {
  try {
    // Use anonymous client for public data
    const supabase = createAnonymousClient();
    
    // If the client is not properly initialized (mock client from error handling)
    if (supabase.from && typeof supabase.from !== 'function') {
      console.error('Invalid Supabase client for reviews');
      return { reviews: [] };
    }
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          student:student_id(
            first_name,
            last_name
          )
        `)
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Database error when fetching reviews:', error.message);
        return { reviews: [] };
      }
      
      // Transform the data to include student name
      const reviews = data.map((review: any) => {
        const student = review.student as any;
        return {
          ...review,
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Anonymous',
          student: undefined
        };
      });
      
      return { reviews };
    } catch (dbError) {
      console.error('Error executing Supabase query for reviews:', dbError);
      return { reviews: [] };
    }
  } catch (err) {
    console.error('Failed to get tutor reviews:', err);
    return { reviews: [] };
  }
}

/**
 * Get average rating for a tutor - public data, no auth required
 */
export async function getTutorAverageRating(tutorId: string) {
  try {
    // Use anonymous client for public data
    const supabase = createAnonymousClient();
    
    // If the client is not properly initialized (mock client from error handling)
    if (supabase.from && typeof supabase.from !== 'function') {
      console.error('Invalid Supabase client for ratings');
      return { averageRating: null, count: 0 };
    }
    
    try {
      const { data, error, count } = await supabase
        .from('reviews')
        .select('rating', { count: 'exact' })
        .eq('tutor_id', tutorId);
      
      if (error) {
        console.error('Database error when fetching average rating:', error.message);
        return { averageRating: null, count: 0 };
      }
      
      const reviewCount = count || 0;
      
      if (reviewCount === 0) {
        return { averageRating: null, count: 0 };
      }
      
      // Calculate average rating
      const sum = data.reduce((acc: number, review: { rating: number }) => acc + review.rating, 0);
      const average = sum / reviewCount;
      
      return { averageRating: average, count: reviewCount };
    } catch (dbError) {
      console.error('Error executing Supabase query:', dbError);
      return { averageRating: null, count: 0 };
    }
  } catch (err) {
    console.error('Failed to get average rating:', err);
    return { averageRating: null, count: 0 };
  }
} 

/**
 * Get reviews for a specific tutor by ID - for API routes
 */
export async function getReviewsByTutorId(tutorId: string): Promise<{
  reviews: Review[];
  error: string | null;
}> {
  try {
    if (!tutorId) {
      return { reviews: [], error: 'Tutor ID is required' };
    }
    
    // Use anonymous client for public data
    const supabase = createAnonymousClient();
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        student:student_id(
          first_name,
          last_name
        )
      `)
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error when fetching reviews:', error.message);
      return { reviews: [], error: error.message };
    }
    
    // Transform the data to include student name
    const reviews = data.map((review: any) => {
      const student = review.student as any;
      return {
        ...review,
        student_name: student ? `${student.first_name} ${student.last_name}` : 'Anonymous',
        student: undefined
      };
    });
    
    return { reviews, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching reviews';
    console.error('Failed to get tutor reviews:', errorMessage);
    return { reviews: [], error: errorMessage };
  }
} 