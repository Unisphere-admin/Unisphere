import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { AuthUser } from '@/lib/auth/protectResource';

// Use edge runtime for better performance
export const runtime = 'edge';

// Use dynamic to prevent caching for this authenticated endpoint
export const dynamic = 'force-dynamic';

async function getTutorByIdHandler(
  request: NextRequest, 
  user: AuthUser, 
  params: { id: string }
): Promise<NextResponse> {
  try {
    // Check premium access or tutor status
    if (!user.is_tutor && !user.has_access) {
      return NextResponse.json(
        { error: 'Premium access required' },
        { status: 403 }
      );
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Tutor ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Try to find by search_id first (which is more user-friendly)
    let { data: tutor, error } = await supabase
      .from('tutor_profile')
      .select('*')
      .eq('search_id', id)
      .single();
      
    // If not found by search_id, try by actual id
    if (!tutor) {
      ({ data: tutor, error } = await supabase
        .from('tutor_profile')
        .select('*')
        .eq('id', id)
        .single());
    }
    
    if (error) {
      console.error(`Error fetching tutor with ID ${id}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }
    
    // Create response with no-cache headers to prevent authentication leakage
    const response = NextResponse.json({ tutor });
    
    // Set no-cache headers to prevent authenticated data from being cached
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error in tutor API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withRouteAuth(getTutorByIdHandler); 