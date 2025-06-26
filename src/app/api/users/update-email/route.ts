import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Set edge runtime for better performance


// POST handler to update user email
async function updateEmailHandler(
  req: NextRequest,
  user: AuthUser
): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    // Get the authenticated user's ID
    const userId = user.id;
    
    // Only allow students to update their email through this endpoint
    // Tutors should go through admin verification
    if (user.is_tutor) {
      return NextResponse.json(
        { error: 'Tutors must contact admin to update email' }, 
        { status: 403 }
      );
    }
    
    // Get supabase client
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Update email using Supabase auth API
    const { data, error } = await supabase.auth.updateUser({
      email: email,
    });
    
    if (error) {
      
      // Handle common errors with user-friendly messages
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'This email is already in use' }, 
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to update email' }, 
        { status: 500 }
      );
    }
    
    // Email update started, user will need to verify new email
    return NextResponse.json({
      message: 'Email update initiated. Please check your new email for verification.',
      success: true
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the wrapped handler
export const POST = withRouteAuth(updateEmailHandler); 