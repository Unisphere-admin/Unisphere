import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const email = formData.get("email");

    if (typeof email !== "string" || !email) {
        return NextResponse.json(
            { error: "A valid email is required." },
            { status: 400 }
        );
    }
    
    const supabase = await createRouteHandlerClientWithCookies();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.nextUrl.origin}/api/auth/update-password`,
    });

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json(
        { message: "Password reset email sent." },
        { status: 200 }
    );
}
