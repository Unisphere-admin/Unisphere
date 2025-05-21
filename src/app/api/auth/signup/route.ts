import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const cookieStore = await cookies();
        
        // Parse JSON body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('Failed to parse request body:', e);
            return new NextResponse(
                JSON.stringify({ error: "Invalid request body" }),
                { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        const { email, password, confirmPassword, userType } = body;
        const isTutor = userType === 'tutor';

        // Validate required fields
        if (!email || !password || !confirmPassword || !userType) {
            console.error('Missing required fields');
            return new NextResponse(
                JSON.stringify({ error: "All fields are required" }),
                { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        const supabase = createRouteHandlerClient({
            cookies: () => cookieStore
        });

        if (password !== confirmPassword) {
            return new NextResponse(
                JSON.stringify({ error: "Passwords do not match" }),
                { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        console.log(`Attempting to sign up ${isTutor ? 'tutor' : 'student'}: ${email}`);
        
        // Sign up with the appropriate user type
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${url.origin}/api/auth/callback`,
                data: {
                    is_tutor: isTutor
                }
            }
        });

        if (error) {
            console.error("Signup error:", error);
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        if (!data.user) {
            console.error("No user data returned");
            return new NextResponse(
                JSON.stringify({ error: "Failed to create user" }),
                { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        console.log(`${isTutor ? 'Tutor' : 'Student'} signup success:`, { 
            userId: data.user.id, 
            email: data.user.email,
            userType: isTutor ? 'tutor' : 'student'
        });

        return new NextResponse(
            JSON.stringify({
                success: true,
                redirectTo: `${url.origin}/signup/confirm`
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        console.error("Unexpected error during signup:", error);
        // Log the full error details
        if (error instanceof Error) {
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        return new NextResponse(
            JSON.stringify({ error: "An unexpected error occurred" }),
            { 
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}