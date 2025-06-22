import { NextRequest, NextResponse } from 'next/server';
import { getTutorBySearchId } from '@/lib/db/tutors';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { AuthUser } from '@/lib/auth/protectResource';

// Set edge runtime for better performance
export const runtime = 'edge';

// Use dynamic to prevent caching for this authenticated endpoint
export const dynamic = 'force-dynamic';

async function getTutorProfileHandler(
  request: NextRequest, 
  user: AuthUser, 
  params: { search_id: string }
): Promise<NextResponse> {
  try {
    // Check premium access or tutor status
    if (!user.is_tutor && !user.has_access) {
      return NextResponse.json(
        { error: 'Premium access required' },
        { status: 403 }
      );
    }

    // Get search_id from params
    const searchId = params.search_id;
    
    if (!searchId) {
      console.error('No search parameter provided');
      return NextResponse.json({ error: 'Search parameter is required' }, { status: 400 });
    }


    // Use data access layer to fetch tutor
    const { tutor, error } = await getTutorBySearchId(searchId);

    // Handle error case
    if (error || !tutor) {
      return NextResponse.json({ error: error || 'Tutor not found' }, { status: 404 });
    }

    
    // Create response with no-cache headers to prevent authentication leakage
    const response = NextResponse.json({ tutor });
    
    // Set no-cache headers to prevent authenticated data from being cached
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Unexpected error in tutor profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withRouteAuth(getTutorProfileHandler);