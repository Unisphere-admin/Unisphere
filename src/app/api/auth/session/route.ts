import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { getUserProfile, createUserProfileIfNeeded } from '@/lib/db/users';

// Export runtime config to optimize API performance with Edge runtime


// Force dynamic to prevent caching of authentication data
export const dynamic = 'force-dynamic';

interface ClientUser {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
}

export async function GET(request: NextRequest) {
    try {
        // Add cache control headers to the response to prevent caching
        const headers: Record<string, string> = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };

        // Get supabase client with cookies
        const supabase = await createRouteHandlerClientWithCookies();
        
        // Check if the auth API is accessible
        if (!supabase || !supabase.auth) {
            return NextResponse.json(
                { error: 'Authentication service unavailable' },
                { status: 500, headers }
            );
        }
        
        // Get authenticated user directly - safer than using getSession()
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            const errorMessage = userError?.message || 'No authenticated user found';
            
            // Handle specific AuthSessionMissingError with a cleaner message
            const isSessionMissingError = 
                userError?.name === 'AuthSessionMissingError' || 
                errorMessage.includes('Auth session missing');
        
            if (isSessionMissingError) {
                // Clear session cookies on client side by returning specific header
                headers['Set-Cookie'] = 'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax';
            } else {
            }
            
            return NextResponse.json(
                { user: null, error: isSessionMissingError ? 'Session expired' : errorMessage },
                { status: 401, headers }
            );
        }
        
        // Check if we need to refresh the session token
        // Note: We use getSession() here ONLY for token refresh purposes, not for authentication
        // Authentication is already handled via getUser() above
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // If session exists but might be expiring soon, refresh it
            if (!sessionError && session && session.expires_at) {
            const expiresAt = new Date(session.expires_at * 1000);
            const now = new Date();
            const timeLeft = expiresAt.getTime() - now.getTime();
            
            // If less than 10 minutes left, refresh the session
            if (timeLeft < 10 * 60 * 1000) {
                await supabase.auth.refreshSession();
            }
        }
        } catch (refreshError: any) {
            // Better error handling for refresh failures
            if (refreshError.name === 'AuthSessionMissingError' || 
                refreshError.message?.includes('Auth session missing')) {
            } else {
            }
            // We can continue as we already have the authenticated user
        }
        
        // Get the user ID from the verified user object
        const userId = user.id;
        const isTutor = user.user_metadata?.is_tutor === true;

        // Try to create user profile if it doesn't exist
        // This handles the first sign-in after registration
        try {
            await createUserProfileIfNeeded(userId, {
                is_tutor: isTutor,
                first_name: user.user_metadata?.first_name,
                last_name: user.user_metadata?.last_name,
                email: user.email
            });
        } catch (profileError) {
            // Log but don't fail - we'll try to get the profile anyway
        }
        
        // Fetch the user profile data
        const { user: profileUser, error: profileError } = await getUserProfile(userId);
        
        if (profileError || !profileUser) {
            // Return minimal user data from user object
            return NextResponse.json({
                user: {
                    id: userId,
                    name: user.email?.split('@')[0] || 'User',
                    email: user.email || '',
                    role: isTutor ? 'tutor' : 'student',
                    tokens: 0,
                    survey_completed: false,
                    hasProfile: false
                }
            }, { headers });
        }
        
        // Create a user object with the required format for the client
        const userResponse = {
            id: profileUser.id,
            name: `${profileUser.first_name || ''} ${profileUser.last_name || ''}`.trim() || 'User',
            email: user.email || '',
            role: profileUser.is_tutor ? 'tutor' : 'student',
            profilePic: profileUser.avatar_url || undefined,
            avatar_url: profileUser.avatar_url || undefined,
            tokens: profileUser.tokens || 0,
            bio: profileUser.bio || undefined,
            has_access: profileUser.has_access || false,
            survey_completed: profileUser.survey_completed || false,
            hasProfile: true
        };
        
        const response = NextResponse.json({ user: userResponse }, { headers });
        
        // Add cache tag for this user to enable proper invalidation on logout
        response.headers.set('Cache-Tag', `user-${userId}`);
        
        return response;
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { 
                status: 500,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                } 
            }
        );
    }
}