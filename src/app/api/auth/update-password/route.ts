import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { csrfMiddleware } from "@/lib/csrf-next";
import { getAuthUser } from "@/lib/auth/protectResource";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        
        // Code verifier might be stored in cookies by Supabase
        // We don't need to manually handle it as Supabase client will
        // extract it from cookies automatically

        if (!code) {
            console.error('No code provided for password reset');
            return NextResponse.redirect(new URL('/login?error=missing-code', req.url));
        }

        const supabase = await createRouteHandlerClientWithCookies();

        // Exchange the code for a session
        // Supabase will automatically use the code verifier from cookies
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Error exchanging code for session:', error);
            return NextResponse.redirect(new URL('/login?error=invalid-code', req.url));
        }

        if (!data || !data.session) {
            console.error('No session returned from code exchange');
            return NextResponse.redirect(new URL('/login?error=no-session', req.url));
        }

        // Successfully exchanged code for session, redirect to reset password page
        console.log('Successfully exchanged code for session, user can now reset password');
        
        // Redirect to reset-password without the code parameter to avoid reusing it
        return NextResponse.redirect(new URL('/reset-password', req.url));
    } catch (error) {
        console.error('Error handling password reset link:', error);
        return NextResponse.redirect(new URL('/login?error=server-error', req.url));
    }
}

export async function POST(req: NextRequest) {
    try {
        // Get the authenticated user
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
        // Check CSRF token
        const csrfError = await csrfMiddleware(req);
        if (csrfError) {
            return csrfError;
        }
        
        // Check if request is JSON or form data
        let password: string;
        const contentType = req.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            // Handle JSON request
            const body = await req.json();
            password = body.password;
        } else {
            // Handle form data request (for backward compatibility)
            const formData = await req.formData();
            password = String(formData.get('password'));
        }

        if (!password) {
            return NextResponse.json({ 
                error: 'Password is required' 
            }, { status: 400 });
        }
        
        if (password.length < 8) {
            return NextResponse.json({ 
                error: 'Password must be at least 8 characters long' 
            }, { status: 400 });
        }

        const supabase = await createRouteHandlerClientWithCookies();
        
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('No authenticated user found:', userError);
            return NextResponse.json({ error: 'No authenticated user found' }, { status: 401 });
        }

        // Update the user's password
        const { data, error } = await supabase.auth.updateUser({
            password
        });

        if (error) {
            console.error('Error updating password:', error);
            return NextResponse.json({ 
                error: error.message || 'Failed to update password' 
            }, { status: 500 });
        }

        // Success
        return NextResponse.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });
    } catch (error) {
        console.error('Error updating password:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Server error' 
        }, { status: 500 });
    }
}