import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(`${url.origin}/login?error=missing-code`);
    }

    try {
        const supabase = await createRouteHandlerClientWithCookies();

        // Exchange the code for a session
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
            console.error('Error exchanging code for session:', error);
            
            // Handle rate limit error specifically
            if (error.status === 429) {
                return NextResponse.redirect(
                    `${url.origin}/login?error=rate-limit&message=Too many attempts. Please try again in a few minutes.`
                );
            }
            
            return NextResponse.redirect(`${url.origin}/login?error=auth-failed`);
        }

        if (!session) {
            return NextResponse.redirect(`${url.origin}/login?error=no-session`);
        }

        // Check if user is a tutor
        const isTutor = session.user.user_metadata?.is_tutor === true;
        
        // Profile creation is now handled by the session API
        // Just redirect to the appropriate page based on user type
        if (isTutor) {
            // For tutors, redirect to the tutor profile creation page
            // This is their onboarding flow
            return NextResponse.redirect(`${url.origin}/profile/create/tutor`);
        } else {
            // For students, redirect to dashboard
            return NextResponse.redirect(`${url.origin}/dashboard`);
        }
    } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        return NextResponse.redirect(`${url.origin}/login?error=server-error`);
    }
}