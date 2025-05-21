import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { getUserProfile } from '@/lib/db/users';

// Export runtime config to optimize API performance with Edge runtime
export const runtime = 'edge';

interface ClientUser {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
}

export async function GET(request: NextRequest) {
    try {
        // Get supabase client with cookies
        const supabase = createRouteHandlerClientWithCookies();
        
        // Get user directly instead of getting session first
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!user || error) {
            return NextResponse.json(
                { user: null },
                { status: 401 }
            );
        }
        
        // Get the user ID from the user object
        const userId = user.id;
        
        // Fetch the user profile data
        const { user: profileUser, error: profileError } = await getUserProfile(userId);
        
        if (profileError || !profileUser) {
            console.error("Error fetching user profile:", profileError);
            // Return minimal user data from user object
            return NextResponse.json({
                user: {
                    id: userId,
                    name: user.email?.split('@')[0] || 'User',
                    email: user.email || '',
                    role: 'user',
                    tokens: 0,
                    hasProfile: false
                }
            });
        }
        
        // Create a user object with the required format for the client
        const userResponse = {
            id: profileUser.id,
            name: `${profileUser.first_name || ''} ${profileUser.last_name || ''}`.trim() || 'User',
            email: user.email || '',
            role: profileUser.is_tutor ? 'tutor' : 'student',
            profilePic: profileUser.avatar_url || undefined,
            tokens: profileUser.tokens || 0,
            bio: profileUser.bio || undefined,
            hasProfile: true
        };
        
        return NextResponse.json({ user: userResponse });
    } catch (error) {
        console.error('Error in session API route:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}