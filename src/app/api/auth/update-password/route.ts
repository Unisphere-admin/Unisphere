import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/login', url.origin));
    }

    const cookieStore = await cookies();

    const supabase = createRouteHandlerClient({
        cookies: () => cookieStore
    });

    try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            return NextResponse.redirect(new URL('/login?error=invalid-code', url.origin));
        }

        return NextResponse.redirect(new URL('/reset-password', url.origin));
    } catch (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(new URL('/login?error=server-error', url.origin));
    }
}

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const cookieStore = await cookies();

    const supabase = createRouteHandlerClient({
        cookies: () => cookieStore
    });
    
    try {
        const formData = await req.formData();
        const password = String(formData.get('password'));

        const {data : {user}} = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL('/login?error=no-session', url.origin));
        }

        const { error } = await supabase.auth.updateUser({
            password
        });

        if (error) {
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        return NextResponse.redirect(new URL('/login?success=password-updated', url.origin));
    } catch (error) {
        console.error('Error updating password:', error);
        return NextResponse.redirect(new URL('/login?error=server-error', url.origin));
    }
}