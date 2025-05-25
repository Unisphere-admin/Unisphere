import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export async function POST(req: NextRequest) {
    try {
    const formData = await req.formData();
    const email = formData.get("email");

    if (typeof email !== "string" || !email) {
        return NextResponse.json(
            { error: "A valid email is required." },
            { status: 400 }
        );
    }
    
    const supabase = await createRouteHandlerClientWithCookies();

        // Send password reset email with redirect URL to update-password route
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.nextUrl.origin}/api/auth/update-password`,
    });

    if (error) {
            console.error("Password reset error:", error.message);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json(
        { message: "Password reset email sent." },
        { status: 200 }
    );
    } catch (error) {
        console.error("Unexpected error in reset password:", error);
        return NextResponse.json(
            { error: "An error occurred while processing your request." },
            { status: 500 }
        );
    }
}
