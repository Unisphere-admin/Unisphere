import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { withCsrfProtection } from '@/lib/csrf/server';
import { 
  createReview,
  getTutorReviews,
  getTutorAverageRating
} from '@/lib/db/reviews';

// Export runtime config for improved performance
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
// Ensure consistent JSON response format with headers
const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

// Helper function to create consistent JSON responses
function createJsonResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { 
    status, 
    headers: jsonHeaders 
  });
}

// GET handler for tutor reviews - no auth required for public data
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get('tutor_id');
    const averageOnly = searchParams.get('average_only') === 'true';
    
    if (!tutorId) {
      return createJsonResponse({ 
        error: 'Tutor ID is required', 
        averageRating: null, 
        count: 0 
      }, 400);
    }
    
    // If only average rating is needed
    if (averageOnly) {
      try {
        const result = await getTutorAverageRating(tutorId);
        
        return createJsonResponse({ 
          averageRating: result.averageRating ?? null, 
          count: result.count ?? 0
        });
      } catch (avgError) {
        console.error('Error fetching average rating:', avgError);
        return createJsonResponse({ 
          error: 'Failed to fetch rating', 
          averageRating: null, 
          count: 0 
        }, 500);
      }
    }
    
    // Get tutor reviews
    try {
      const result = await getTutorReviews(tutorId);
      
      return createJsonResponse({ 
        reviews: result.reviews ?? [] 
      });
    } catch (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return createJsonResponse({ 
        error: 'Failed to fetch reviews', 
        reviews: [] 
      }, 500);
    }
  } catch (error) {
    console.error('Reviews API error:', error);
    
    // Always return a valid JSON response even on unexpected errors
    return createJsonResponse({ 
      error: 'Internal server error', 
      reviews: [],
      averageRating: null,
      count: 0
    }, 500);
  }
}

// POST handler for creating reviews - requires authentication
async function postReviewHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { tutor_id, rating, review } = body;
    
    if (!tutor_id || !rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return createJsonResponse({ 
        error: 'Tutor ID and valid rating (1-5) are required' 
      }, 400);
    }
    
    // Create the review
    const result = await createReview(
      user.id, // Student ID is the authenticated user
      tutor_id,
      rating,
      review
    );
    
    if (result.error) {
      return createJsonResponse({ error: result.error }, 500);
    }
    
    return createJsonResponse({ review: result.review });
  } catch (error) {
    return createJsonResponse({ error: 'Internal server error' }, 500);
  }
}

// Export only the POST handler with auth wrapper
export const POST = withRouteAuth(withCsrfProtection(postReviewHandler)); 