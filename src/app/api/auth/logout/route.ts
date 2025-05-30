import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';
import { clearCsrfToken } from "@/lib/csrf/server";

// Ensure this route is never cached
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client with the correct API
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Check if user is authenticated first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // User is already logged out
      console.log('User already logged out');
      // Still try to clear the CSRF token
      try {
        await clearCsrfToken();
      } catch (csrfError) {
        console.error('Error clearing CSRF token but continuing:', csrfError);
      }
      return NextResponse.json({ success: true, status: "already-logged-out" });
    }

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out from Supabase:', error);
      return NextResponse.json({ error: error.message, status: "error" }, { status: 500 });
    } else {
      // Add paths that need to be revalidated after logout
      try {
        revalidatePath('/');
        revalidatePath('/dashboard');
        revalidatePath('/login');
        console.log('Cache revalidated after logout');
      } catch (cacheError) {
        console.error('Error revalidating cache:', cacheError);
        // Don't fail the request if cache revalidation fails
      }
    }
    
    // Clear CSRF token cookie
    try {
      await clearCsrfToken();
    } catch (csrfError) {
      console.error('Error clearing CSRF token but continuing:', csrfError);
    }
    
    console.log('User successfully logged out, all auth cookies cleared and cache invalidated');
    
    // Return a success response
    return NextResponse.json({ success: true, status: "success" });
  } catch (error) {
    console.error('Unexpected error during logout:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout', status: "error" },
      { status: 500 }
    );
  }
}
