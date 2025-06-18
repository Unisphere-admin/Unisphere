import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { validateRequest } from '@/lib/auth/validateRequest';

// Use edge runtime for better performance
export const runtime = 'edge';

// Use dynamic to prevent caching for this authenticated endpoint
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`[TUTOR API] Received request for tutor with ID: ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Tutor ID is required' },
        { status: 400 }
      );
    }

    // Validate the user (but don't require authentication)
    const { user } = await validateRequest(request);
    console.log(`[TUTOR API] Request auth status: ${user ? 'Authenticated' : 'Not authenticated'}`);
    
    // Determine if user has premium access
    const hasPremiumAccess = user?.is_tutor || user?.has_access;
    
    const supabase = await createRouteHandlerClientWithCookies();
    
    // First try to find by search_id
    let query = supabase
      .from('tutor_profile')
      .select('*')
      .eq('search_id', id);
    
    let { data: tutor, error } = await query.single();
      
    // If not found by search_id, try by actual id
    if (!tutor) {
      console.log(`[TUTOR API] Tutor not found by search_id, trying by ID`);
      query = supabase
        .from('tutor_profile')
        .select('*')
        .eq('id', id);
        
      const result = await query.single();
      tutor = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error(`Error fetching tutor with ID ${id}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (!tutor) {
      console.log(`[TUTOR API] Tutor not found for ID: ${id}`);
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }
    
    console.log(`[TUTOR API] Tutor found: ${tutor.first_name} ${tutor.last_name}`);
    console.log(`[TUTOR API] Previous education: ${JSON.stringify(tutor.previous_education)}`);
    
    // Filter the tutor data based on premium access
    // Always include these fields for public access
    const filteredTutor = {
      id: tutor.id,
      search_id: tutor.search_id,
      first_name: tutor.first_name,
      last_name: tutor.last_name,
      description: tutor.description,
      current_education: tutor.current_education,
      previous_education: tutor.previous_education,
      major: tutor.major,
      year: tutor.year
    };
    
    // Only include premium fields if user has access
    if (hasPremiumAccess) {
      Object.assign(filteredTutor, {
        avatar_url: tutor.avatar_url,
        subjects: tutor.subjects,
        extracurriculars: tutor.extracurriculars,
        "a-levels": tutor["a-levels"],
        gcse: tutor.gcse,
        spm: tutor.spm
      });
    } else {
      // Set avatar to null for non-premium users
      Object.assign(filteredTutor, {
        avatar_url: null
      });
    }
    
    // Create response with no-cache headers
    const response = NextResponse.json({ tutor: filteredTutor });
    
    // Set cache control headers
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