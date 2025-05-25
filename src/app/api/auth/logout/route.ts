import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';

// Ensure this route is never cached
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get supabase client with cookies
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Get the user ID before signing out (for cache invalidation)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
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
    
    // Set comprehensive cache control headers to prevent caching and invalidate existing caches
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    // Add cache tags for Vercel to properly invalidate user-specific cached data
    // This uses the userId as a tag to invalidate all user-specific cache entries
    if (userId) {
      response.headers.set('Cache-Tag', `user-${userId}`);
      
      try {
        // Revalidate key user data paths
        revalidatePath('/dashboard');
        revalidatePath('/api/conversations');
        revalidatePath('/api/messages');
        revalidatePath('/api/tutoring-sessions');
        
        // Specifically for this user's data
        revalidatePath(`/api/users/profile/${userId}`);
        
        console.log(`Cache invalidated for user ${userId}`);
      } catch (revalidateError) {
        console.error('Error invalidating cache paths:', revalidateError);
        // Continue anyway as this is not critical
      }
    }
    
    console.log('User successfully logged out, all auth cookies cleared and cache invalidated');
    return response;
  } catch (error) {
    console.error('Error in logout API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
