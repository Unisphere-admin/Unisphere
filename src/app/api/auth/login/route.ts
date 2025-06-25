import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { getUserProfile } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Get supabase client with cookies
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Attempt to sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    // At this point, the user is authenticated
    const userId = data.user.id;
    
    // Prepare basic user response from auth data
    const basicUserData = {
      id: userId,
      email: data.user.email || '',
      role: 'user', // Default role until profile is retrieved
      name: email.split('@')[0], // Use part of the email as a fallback name
      hasProfile: false
    };
    
    try {
      // Try to fetch the user profile data
      const { user: profile, error: profileError } = await getUserProfile(userId);
      
      // If profile exists, use its data
      if (profile && !profileError) {
        return NextResponse.json({ 
          user: {
            id: userId,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || basicUserData.name,
            email: data.user.email || '',
            role: profile.is_tutor ? 'tutor' : 'student',
            profilePic: profile.avatar_url || undefined,
            tokens: profile.tokens || 0,
            bio: profile.bio || undefined,
            hasProfile: true
          },
          message: 'Login successful'
        });
      } else {
        // Profile doesn't exist but the user is authenticated
        
        return NextResponse.json({ 
          user: basicUserData,
          message: 'Login successful, but profile incomplete',
          needsProfile: true
        });
      }
    } catch (profileError) {
      // Even if profile retrieval fails, return the authenticated user
      
      return NextResponse.json({ 
        user: basicUserData,
        message: 'Login successful, but profile incomplete',
        needsProfile: true
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}