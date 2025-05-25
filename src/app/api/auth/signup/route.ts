import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        
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

        const { email, password, confirmPassword, userType, firstName, lastName } = body;
        const isTutor = userType === 'tutor';

        // Validate required fields
        if (!email || !password || !confirmPassword || !userType || !firstName || !lastName) {
            const missingFields = [];
            if (!email) missingFields.push('email');
            if (!password) missingFields.push('password');
            if (!confirmPassword) missingFields.push('confirm password');
            if (!userType) missingFields.push('user type');
            if (!firstName) missingFields.push('first name');
            if (!lastName) missingFields.push('last name');
            
            console.error(`Missing required fields: ${missingFields.join(', ')}`);
            return new NextResponse(
                JSON.stringify({ error: "All fields are required", missingFields }),
                { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        const supabase = await createRouteHandlerClientWithCookies();

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
                    is_tutor: isTutor,
                    first_name: firstName,
                    last_name: lastName
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
            userType: isTutor ? 'tutor' : 'student',
            name: `${firstName} ${lastName}`
        });

        // Profile creation is now handled by session API on sign-in
        // No need to create profile here, which was causing RLS errors

        return new NextResponse(
            JSON.stringify({
                success: true,
                userId: data.user.id,
                email: data.user.email,
                redirectTo: `${url.origin}/login?signup=success`
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