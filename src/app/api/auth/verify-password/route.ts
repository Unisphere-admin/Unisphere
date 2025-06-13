import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { csrfMiddleware } from "@/lib/csrf/server";
import { getAuthUser } from "@/lib/auth/protectResource";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check CSRF token
    const csrfError = await csrfMiddleware(req, authUser);
    if (csrfError) {
      return csrfError;
    }
    
    // Parse request body
    const body = await req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    // Verify that the email matches the authenticated user's email
    if (email !== authUser.email) {
      return NextResponse.json({ error: 'Email does not match authenticated user' }, { status: 403 });
    }
    
    // Create Supabase client
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Attempt to sign in with the provided credentials
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // If there's an error, the password is incorrect
    if (error) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Password is correct
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 