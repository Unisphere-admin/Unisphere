import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Set edge runtime for better performance
export const runtime = 'edge';

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
    
    const supabase = await createRouteHandlerClientWithCookies();
    const userId = user.id;

    // First check if user exists and get their role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_tutor')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Define updateData object with allowed fields based on role
    const isTutor = userData.is_tutor;
    let updateData: Record<string, any> = {};
    let profileTable = isTutor ? 'tutor_profile' : 'student_profile';
    
    // Filter fields based on role
    if (isTutor) {
      // Tutor profile fields that can be updated
      if (body.first_name !== undefined) updateData.first_name = body.first_name;
      if (body.last_name !== undefined) updateData.last_name = body.last_name;
      if (body.age !== undefined) updateData.age = body.age;
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    } else {
      // Student profile fields that can be updated
      if (body.first_name !== undefined) updateData.first_name = body.first_name;
      if (body.last_name !== undefined) updateData.last_name = body.last_name;
      if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    }
    
    // If trying to update email, update the auth.users table
    if (body.email !== undefined) {
      // This requires admin privileges, so we use server-side RPC
      // or function call instead of direct table access
      
      // For now, we'll just return a not implemented error
      return NextResponse.json(
        { error: 'Email updates are not supported yet' }, 
        { status: 501 }
      );
      
      // In a real implementation, you would:
      // 1. Call an admin function or server-side RPC
      // 2. Use Supabase auth.updateUserById or similar
      // 3. Handle email verification for the new email
    }
    
    // Only proceed if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' }, 
        { status: 400 }
      );
    }
    
    // Update the profile
    const { data, error } = await supabase
      .from(profileTable)
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: data
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