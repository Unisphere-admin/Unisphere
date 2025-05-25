import { NextRequest, NextResponse } from 'next/server';
import { getTutorBySearchId } from '@/lib/db/tutors';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { AuthUser } from '@/lib/auth/protectResource';

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

    console.log(`[TUTOR API] Received request for tutor with search_id: ${searchId}`);

    // Use data access layer to fetch tutor
    const { tutor, error } = await getTutorBySearchId(searchId);

    // Handle error case
    if (error || !tutor) {
      console.log(`[TUTOR API] Error fetching tutor: ${error}`);
      return NextResponse.json({ error: error || 'Tutor not found' }, { status: 404 });
    }

    console.log(`[TUTOR API] Successfully fetched tutor: ${tutor.first_name} ${tutor.last_name}`);
    return NextResponse.json({ tutor });
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