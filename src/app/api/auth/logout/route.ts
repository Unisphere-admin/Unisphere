import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';

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
      return NextResponse.json({ success: true, status: "already-logged-out" });
    }

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return NextResponse.json({ error: error.message, status: "error" }, { status: 500 });
    } else {
      // Add paths that need to be revalidated after logout
      try {
        revalidatePath('/');
        revalidatePath('/dashboard');
        revalidatePath('/login');
      } catch (cacheError) {
        // Don't fail the request if cache revalidation fails
      }
    }
    
    
    // Return a success response
    return NextResponse.json({ success: true, status: "success" });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout', status: "error" },
      { status: 500 }
    );
  }
}
