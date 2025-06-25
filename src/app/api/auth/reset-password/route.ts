import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export async function POST(req: NextRequest) {
    try {
        // Check if request is JSON or form data
        let email: string;
        const contentType = req.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            // Handle JSON request
            const body = await req.json();
            email = body.email;
        } else {
            // Handle form data request
    const formData = await req.formData();
            email = String(formData.get("email"));
        }

        if (!email || typeof email !== "string" || !email.includes('@')) {
        return NextResponse.json(
            { error: "A valid email is required." },
            { status: 400 }
        );
    }
    
    const supabase = await createRouteHandlerClientWithCookies();

        // Send password reset email with redirect URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
            // This URL will receive the code parameter from Supabase
            redirectTo: `${req.nextUrl.origin}/reset-password`,
    });

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json(
            { message: "Password reset email sent. Please check your inbox." },
        { status: 200 }
    );
    } catch (error) {
        return NextResponse.json(
            { error: "An error occurred while processing your request." },
            { status: 500 }
        );
    }
}
