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
    
    // Create a response with success message
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
    
    // List of all Supabase auth-related cookies to clear
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      '__session',
      'sb-auth-token'
    ];
    
    // Clear each cookie
    cookiesToClear.forEach(cookieName => {
      // First delete the cookie
      response.cookies.delete(cookieName);
      
      // Then set an empty one with past expiration
      response.cookies.set(cookieName, '', {
        path: '/',
        expires: new Date(0),
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    });
    
    // Set Cache-Control to prevent caching of this response
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    console.log('User successfully logged out, all auth cookies cleared');
    return response;
  } catch (error) {
    console.error('Error in logout API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
