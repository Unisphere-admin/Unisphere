import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const type = url.searchParams.get('type');

    if (!code) {
        return NextResponse.redirect(`${url.origin}/login?error=missing-code`);
    }

    try {
        const supabase = await createRouteHandlerClientWithCookies();

        // Exchange the code for a session
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
            
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

        // Handle email verification specifically
        if (type === 'email_change' || type === 'signup' || type === 'recovery') {
            // For email verification, we need to make sure the user is properly authenticated
            // Refresh the session to ensure all claims are updated
            await supabase.auth.refreshSession();
            
            // If this is an email change, show success message
            if (type === 'email_change') {
                return NextResponse.redirect(`${url.origin}/dashboard/settings?email_verified=true`);
            }
            
            // If this is account recovery, redirect to reset password
            if (type === 'recovery') {
                return NextResponse.redirect(`${url.origin}/reset-password?code=${code}`);
            }
        }

        // Check if user is a tutor
        const isTutor = session.user.user_metadata?.is_tutor === true;
        
        // Check if the user has premium access
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('has_access')
            .eq('id', session.user.id)
            .single();
            
        if (userError) {
        }
        
        const hasPremiumAccess = isTutor || userData?.has_access === true;
        
        // For new signups or regular logins
        if (isTutor) {
            // For tutors, check if they have completed onboarding
            const { data: tutorProfile } = await supabase
                .from('tutor_profile')
                .select('id')
                .eq('id', session.user.id)
                .single();
                
            if (!tutorProfile) {
                // Tutor needs to complete onboarding
            return NextResponse.redirect(`${url.origin}/profile/create/tutor`);
            }
            
            // Tutor has profile, redirect to dashboard
            return NextResponse.redirect(`${url.origin}/dashboard`);
        } else {
            // For students, check if they have premium access
            if (hasPremiumAccess) {
                // Premium students go to dashboard
                return NextResponse.redirect(`${url.origin}/dashboard`);
            } else {
                // Non-premium students go to home page
                return NextResponse.redirect(`${url.origin}/`);
            }
        }
    } catch (err) {
        return NextResponse.redirect(`${url.origin}/login?error=server-error`);
    }
}