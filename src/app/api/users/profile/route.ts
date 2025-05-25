import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { updateUserProfile } from '@/lib/db/users';

// Set edge runtime for better performance
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// PATCH handler to update user profile
async function updateUserProfileHandler(
  req: NextRequest,
  user: AuthUser
): Promise<NextResponse> {
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }
    
    const userId = user.id;
    
    // Handle email update special case
    if (body.email !== undefined) {
      // This requires admin privileges, so we use server-side RPC
      // or function call instead of direct table access
      
      // For now, we'll just return a not implemented error
      return NextResponse.json(
        { error: 'Email updates are not supported yet' }, 
        { status: 501 }
      );
    }
    
    // Use the data layer function to update profile
    const { profile, error } = await updateUserProfile(userId, user, body);
    
    // Handle errors
    if (error) {
      // Map error messages to appropriate status codes
      if (error === 'Access denied') {
        return NextResponse.json({ error }, { status: 403 });
      } else if (error === 'User not found') {
        return NextResponse.json({ error }, { status: 404 });
      } else if (error === 'No valid fields to update') {
        return NextResponse.json({ error }, { status: 400 });
      } else {
        return NextResponse.json({ error }, { status: 500 });
      }
    }
    
    // Return success response
    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Export the wrapped handler
export const PATCH = withRouteAuth(updateUserProfileHandler); 