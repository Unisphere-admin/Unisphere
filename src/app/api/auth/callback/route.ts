import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(`${url.origin}/login?error=missing-code`);
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
        cookies: () => cookieStore
    });

    try {
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
        
        // Redirect to appropriate profile creation page
        if (isTutor) {
            return NextResponse.redirect(`${url.origin}/profile/create/tutor`);
        } else {
            return NextResponse.redirect(`${url.origin}/profile/create`);
        }
    } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        return NextResponse.redirect(`${url.origin}/login?error=server-error`);
    }
}