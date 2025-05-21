import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

export const revalidate = 3600; // Revalidate at most once per hour

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
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
    
    // Add cache control headers (1 hour)
    const response = NextResponse.json({ tutor });
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    
    return response;
  } catch (error) {
    console.error('Error in tutor API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 