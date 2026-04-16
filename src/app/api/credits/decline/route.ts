import { NextRequest, NextResponse } from "next/server";
import { withRouteAuth } from "@/lib/auth/validateRequest";
import { withCsrfProtection } from "@/lib/csrf-next";
import { createClient } from "@supabase/supabase-js";

// Force dynamic
export const dynamic = "force-dynamic";

async function declineCreditRequestHandler(req: NextRequest, user: any) {
  try {
    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json();
    const { message_id, tutor_id } = body || {};


    if (!message_id || !tutor_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Student is the current user
    const studentId = user.id;

    // Use service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if already processed (accepted or declined)
    const { data: existing } = await supabaseAdmin
      .from("processed_credit_requests")
      .select("message_id, status")
      .eq("message_id", message_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ 
        error: "This request has already been processed",
        alreadyProcessed: true 
      }, { status: 409 });
    }

    // Record the declined status
    await supabaseAdmin.from("processed_credit_requests").insert({
      message_id,
      student_id: studentId,
      tutor_id,
      amount: 0, // No transfer happened
      status: 'declined',
      processed_at: new Date().toISOString(),
    });


    return NextResponse.json({ 
      success: true,
      status: 'declined'
    });
  } catch (error) {
    console.error('Decline error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = withRouteAuth(withCsrfProtection(declineCreditRequestHandler));
