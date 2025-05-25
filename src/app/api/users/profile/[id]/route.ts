import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { getUserProfileById } from '@/lib/db/users';

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
    
    // Use the data layer function to get profile data
    const { profile, error } = await getUserProfileById(userId, user);
    
    // Handle errors
    if (error) {
      // Map error messages to appropriate status codes
      if (error === 'Access denied') {
        return NextResponse.json({ error }, { status: 403 });
      } else if (error === 'User not found' || error === 'Profile not found') {
        return NextResponse.json({ error }, { status: 404 });
      } else {
        return NextResponse.json({ error }, { status: 500 });
      }
    }
    
    // Return the profile data
    return NextResponse.json({ profile });
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