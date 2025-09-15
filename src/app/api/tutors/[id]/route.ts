import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { validateRequest } from '@/lib/auth/validateRequest';
import { getTutorBySearchId } from '@/lib/db/tutors';

// Use edge runtime for better performance


// Use dynamic to prevent caching for this authenticated endpoint
export const dynamic = 'force-dynamic';

// Function to generate a number from a string (for single tutor lookup)
function generateNumberFromString(input: string): string {
  // Use the sum of character codes to create a number
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i);
  }
  return (sum % 999 + 1).toString(); // Generate a number between 1-999
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Tutor ID is required' },
        { status: 400 }
      );
    }

    // Validate the user (but don't require authentication)
    const { user } = await validateRequest(request);
    
    // Determine if user has premium access
    const hasPremiumAccess = user?.is_tutor || user?.has_access;
    
    // Try to find tutor by search_id first, pass premium access status
    const { tutor, error } = await getTutorBySearchId(id, hasPremiumAccess);
    
    if (error) {
      // If not found by search_id, try by actual ID
      if (error === 'Tutor not found') {
    const supabase = await createRouteHandlerClientWithCookies();
    
        const { data: tutorById, error: idError } = await supabase
      .from('tutor_profile')
      .select('*')
          .eq('id', id)
          .single();
          
        if (idError || !tutorById) {
          return NextResponse.json(
            { error: 'Tutor not found' },
            { status: 404 }
          );
        }
        
        // No need to process country field - it's already a text[] array in PostgreSQL
        
        // All users get full access to tutor data - no anonymization
        
        // Create response with no-cache headers
        const response = NextResponse.json({ tutor: tutorById });
        
        // Set cache control headers
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
      }
      
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }
    
    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }
    
    // Create response with no-cache headers
    const response = NextResponse.json({ tutor });
    
    // Set cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}