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

        const {
            email, password, confirmPassword, userType,
            firstName, lastName, first_name, last_name,
            country,
            destination, universities, school, applicationCycle, studentCountry, exams, intendedMajor
        } = body;

        // Handle both naming conventions for fields
        const actualFirstName = firstName || first_name;
        const actualLastName = lastName || last_name;
        const isTutor = userType === 'tutor';
        const userCountry = country || 'MY'; // Default to Malaysia if not provided

        // Reject tutor registrations - only students can register
        if (isTutor) {
            return new NextResponse(
                JSON.stringify({ error: "Tutor accounts can only be created by administrators" }),
                { 
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        // Validate required fields
        if (!email || !password || !userType || !actualFirstName || !actualLastName) {
            const missingFields = [];
            if (!email) missingFields.push('email');
            if (!password) missingFields.push('password');
            if (!userType) missingFields.push('user type');
            if (!actualFirstName) missingFields.push('first name');
            if (!actualLastName) missingFields.push('last name');
            
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

        // If confirmPassword is not present, assume it matches password
        const passwordsMatch = !confirmPassword || password === confirmPassword;
        if (!passwordsMatch) {
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

        
        // Sign up with the appropriate user type
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${url.origin}/api/auth/callback`,
                data: {
                    is_tutor: isTutor,
                    first_name: actualFirstName,
                    last_name: actualLastName,
                    country: userCountry
                }
            }
        });

        if (error) {
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

        // Create student profile with all collected onboarding data
        try {
            const { error: profileError } = await supabase
                .from('student_profile')
                .insert({
                    id: data.user.id,
                    first_name: actualFirstName,
                    last_name: actualLastName,
                    country: studentCountry || userCountry,
                    countries_to_apply: destination || null,
                    universities_to_apply: universities ? JSON.stringify(universities) : null,
                    school_name: school || null,
                    application_cycle: applicationCycle || null,
                    planned_admissions_tests: exams ? JSON.stringify(exams) : null,
                    intended_major: intendedMajor || null,
                    survey_completed: true,
                });

            if (profileError) {
                console.error('Error creating student profile:', profileError);
                // Don't fail the signup if profile creation fails
                // The profile can be created later when the user first signs in
            }
        } catch (profileError) {
            console.error('Error creating student profile:', profileError);
            // Don't fail the signup if profile creation fails
        }

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
        // Log the full error details
        if (error instanceof Error) {
            // Object was part of a removed console.error statement
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