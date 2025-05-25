import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByTutorId } from '@/lib/db/reviews';

export const revalidate = 3600; // Revalidate at most once per hour
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const tutorId = params.id;
    
    if (!tutorId) {
      return NextResponse.json(
        { error: 'Tutor ID is required' },
        { status: 400 }
      );
    }
    
    const { reviews, error } = await getReviewsByTutorId(tutorId);
    
    if (error) {
      console.error(`Error fetching reviews for tutor ${tutorId}:`, error);
      return NextResponse.json(
        { error: `Failed to fetch reviews: ${error}` },
        { status: 500 }
      );
    }
    
    // Add cache control headers (10 minutes)
    const response = NextResponse.json({ reviews });
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    
    return response;
  } catch (error) {
    console.error('Error in tutor reviews API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 