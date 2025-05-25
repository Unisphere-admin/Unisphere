import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Set edge runtime for better performance
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
// GET handler to retrieve a user's profile
async function getUserProfileHandler(
  req: NextRequest,
  user: AuthUser,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const userId = params.id;
    
    // Require authentication for profile access
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // For security, users can only access their own profile unless they have elevated permissions
    if (userId !== user.id && !user.is_tutor) {  // Assuming tutors can view student profiles
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const supabase = await createRouteHandlerClientWithCookies();
    
    // First check if user exists and get their role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_tutor')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Fetch profile based on user role
    const isTutor = userData.is_tutor;
    const profileTable = isTutor ? 'tutor_profile' : 'student_profile';
    
    const { data: profileData, error: profileError } = await supabase
      .from(profileTable)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      profile: profileData
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the wrapped handler
export const GET = withRouteAuth(getUserProfileHandler); 