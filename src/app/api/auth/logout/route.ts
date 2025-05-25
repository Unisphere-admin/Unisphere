import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  try {
    // Get supabase client with cookies
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Sign out the user - this will clear the session cookie on the server side
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Set cookie expiry headers to clear auth cookies on the client side
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
    
    // Clear specific cookies to ensure proper logout
    response.cookies.set('sb-access-token', '', { 
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    response.cookies.set('sb-refresh-token', '', { 
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    return response;
  } catch (error) {
    console.error('Error in logout API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
