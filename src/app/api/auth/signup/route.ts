import { createRouteHandlerClientWithCookies } from "@/lib/db/client";
import { createClient } from "@supabase/supabase-js";
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

        // Create student profile with all collected onboarding data.
        //
        // Two distinct things are necessary here, both via the service role:
        //
        //   1. Upsert public.users. There IS a Supabase trigger that mirrors
        //      auth.users into public.users, but it fires asynchronously after
        //      auth.signUp() returns. If we insert into student_profile right
        //      away, the FK student_profile_id_fkey -> public.users(id) blows
        //      up with 23503 "Key (id)=... is not present in table users".
        //      That race condition is why ~70 prior signups ended up as
        //      orphan auth accounts with no profile.
        //
        //   2. Insert student_profile. This used to use the cookie-based
        //      client which is anonymous at signup time, getting blocked by
        //      RLS (42501). Service role bypasses RLS so the row goes in.
        //
        // Order matters. public.users first, then student_profile.
        try {
            const adminSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Step 1: ensure public.users row exists. Upsert so we don't
            // collide if the trigger HAS already fired by the time we get
            // here. We only set the columns we know about; tokens/has_access
            // default to 0/false in the table definition.
            const { error: pubError } = await adminSupabase
                .from('users')
                .upsert(
                    {
                        id: data.user.id,
                        email: data.user.email,
                        is_tutor: false,
                    },
                    { onConflict: 'id', ignoreDuplicates: false }
                );

            if (pubError) {
                console.error('CRITICAL: public.users upsert failed for user', data.user.id, pubError);
                // Don't bail — student_profile insert below might still
                // succeed if the trigger has populated public.users by now.
            }

            // Step 2: insert student_profile.
            const { error: profileError } = await adminSupabase
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
                console.error('CRITICAL: student_profile insert failed for user', data.user.id, profileError);
            }
        } catch (profileError) {
            console.error('CRITICAL: profile setup threw for user', data.user.id, profileError);
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