import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
        cookies: () => cookieStore
    });

    try {
        await supabase.auth.signOut();
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error during sign out:', error);
        return NextResponse.json(
            { error: 'Something went wrong during sign out.' },
            { status: 500 }
        );
    }
} 