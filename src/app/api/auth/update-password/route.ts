import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { csrfMiddleware } from "@/lib/csrf/server";
import { getAuthUser } from "@/lib/auth/protectResource";

export async function GET(req: NextRequest) {
    try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
            console.error('No code provided for password reset');
            return NextResponse.redirect(new URL('/login?error=missing-code', req.url));
    }

        const supabase = await createRouteHandlerClientWithCookies();

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Error exchanging code for session:', error);
            return NextResponse.redirect(new URL('/login?error=invalid-code', req.url));
        }

        return NextResponse.redirect(new URL('/reset-password', req.url));
    } catch (error) {
        console.error('Error exchanging code for session:', error);
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
        const csrfError = await csrfMiddleware(req, authUser);
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

        if (!password || password.length < 6) {
            return NextResponse.json({ 
                error: 'Password must be at least 6 characters long' 
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
        const { error } = await supabase.auth.updateUser({
            password
        });

        if (error) {
            console.error('Error updating password:', error);
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        // Success
        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}