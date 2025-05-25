import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { AuthUser } from '@/lib/auth/protectResource';

// Use edge runtime for better performance
export const runtime = 'edge';

// Use revalidation for better performance with Vercel edge caching (not global)
export const revalidate = 3600; // Revalidate at most once per hour

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
    
    // Create response with tutor data
    const response = NextResponse.json({ tutor });
    
    // Edge-only caching with stale-while-revalidate pattern
    // CDN-Cache-Control is for Vercel's edge cache only (not global)
    response.headers.set('CDN-Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    
    // Cache-Control for browsers, restricting to edge cache only
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=1800');
    
    // Add Vercel-specific header to prevent global caching
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    
    // Add Surrogate-Control to explicitly avoid global caching
    response.headers.set('Surrogate-Control', 'max-age=3600');
    
    // Add cache tag for better invalidation
    response.headers.set('Cache-Tag', `tutor-${id}`);
    
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