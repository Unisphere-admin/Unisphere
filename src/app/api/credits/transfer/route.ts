import { NextRequest, NextResponse } from "next/server";
import { withRouteAuth } from "@/lib/auth/validateRequest";
import { withCsrfProtection } from "@/lib/csrf-next";
import { createClient } from "@supabase/supabase-js";

// Force dynamic
export const dynamic = "force-dynamic";

async function transferCreditsHandler(req: NextRequest, user: any) {
  console.log('=== TRANSFER API CALLED ===');
  try {
    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json();
    const { message_id, tutor_id, amount } = body || {};

    console.log('Credit transfer request:', { message_id, tutor_id, amount, studentId: user.id });

    if (!tutor_id || !amount) {
      return NextResponse.json({ error: "Missing required fields: tutor_id and amount" }, { status: 400 });
    }

    const transferAmount = parseInt(amount, 10);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Student is the current user
    const studentId = user.id;

    // Use service role client for all operations (bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if transaction already exists for this message (prevent duplicates)
    if (message_id) {
      const { data: existingTransaction } = await supabaseAdmin
        .from("processed_credit_requests")
        .select("message_id")
        .eq("message_id", message_id)
        .maybeSingle();

      if (existingTransaction) {
        console.log('Transaction already exists for message:', message_id);
        return NextResponse.json({ 
          error: "This credit request has already been processed",
          alreadyProcessed: true 
        }, { status: 409 });
      }
    }

    // Fetch current token balances
    const { data: studentData, error: studentErr } = await supabaseAdmin
      .from("users")
      .select("tokens")
      .eq("id", studentId)
      .single();

    if (studentErr || !studentData) {
      console.error('Student lookup error:', { studentId, error: studentErr });
      return NextResponse.json({ error: "Student user not found" }, { status: 404 });
    }

    const studentTokens = Number(studentData.tokens || 0);
    if (studentTokens < transferAmount) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
    }

    // Fetch tutor tokens - try with admin client to bypass RLS
    const { data: tutorData, error: tutorErr } = await supabaseAdmin
      .from("users")
      .select("tokens, id")
      .eq("id", tutor_id)
      .maybeSingle();

    // Debug: check all rows for this tutor_id
    const { data: allTutorRows, error: allErr } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", tutor_id);

    // Also check if tutor exists in tutor_profile
    const { data: tutorProfile, error: tutorProfileErr } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name")
      .eq("id", tutor_id)
      .maybeSingle();

    console.log('Tutor lookup result:', { 
      tutorData, 
      tutorErr, 
      tutor_id, 
      hasData: !!tutorData, 
      allRowsCount: allTutorRows?.length, 
      allRows: allTutorRows,
      tutorProfile,
      tutorProfileExists: !!tutorProfile
    });

    if (tutorErr || !tutorData) {
      console.error('Tutor not found in users table:', { 
        tutor_id, 
        error: tutorErr,
        tutorProfileExists: !!tutorProfile,
        tutorProfileData: tutorProfile 
      });
      return NextResponse.json({ 
        error: "Tutor user not found in users table", 
        details: tutorErr?.message || "No tutor data",
        tutor_id,
        tutorProfileExists: !!tutorProfile,
        hint: tutorProfile ? "Tutor exists in tutor_profile but not in users table - database inconsistency" : "Tutor doesn't exist in any table"
      }, { status: 404 });
    }

    const tutorTokens = Number(tutorData.tokens || 0);

    // Fetch snapshot names from profile tables (best-effort)
    const { data: studentProf } = await supabaseAdmin
      .from("users")
      .select("first_name,last_name")
      .eq("id", studentId)
      .single();
    const { data: tutorProf } = await supabaseAdmin
      .from("users")
      .select("first_name,last_name")
      .eq("id", tutor_id)
      .single();

    const studentFirst = studentProf?.first_name || null;
    const studentLast = studentProf?.last_name || null;
    const tutorFirst = tutorProf?.first_name || null;
    const tutorLast = tutorProf?.last_name || null;

    // Perform updates - debit student
    const newStudentTokens = studentTokens - transferAmount;
    const { data: updatedStudent, error: updateStudentErr } = await supabaseAdmin
      .from("users")
      .update({ tokens: newStudentTokens })
      .eq("id", studentId)
      .select()
      .single();

    if (updateStudentErr) {
      console.error('Failed to debit student:', { studentId, error: updateStudentErr });
      return NextResponse.json({ error: "Failed to debit student account" }, { status: 500 });
    }

    // Credit tutor
    const newTutorTokens = tutorTokens + transferAmount;
    const { data: updatedTutor, error: updateTutorErr } = await supabaseAdmin
      .from("users")
      .update({ tokens: newTutorTokens })
      .eq("id", tutor_id)
      .select()
      .single();

    if (updateTutorErr) {
      // Attempt to rollback student update (best-effort)
      await supabaseAdmin.from("users").update({ tokens: studentTokens }).eq("id", studentId);
      console.error('Failed to credit tutor:', { tutor_id, error: updateTutorErr });
      return NextResponse.json({ error: "Failed to credit tutor account" }, { status: 500 });
    }

    // Record that this message has been processed (for status tracking)
    if (message_id) {
      try {
        await supabaseAdmin.from("processed_credit_requests").insert({
          message_id,
          student_id: studentId,
          tutor_id,
          amount: transferAmount,
          status: 'accepted',
          processed_at: new Date().toISOString(),
        });
        console.log('Credit request marked as processed:', message_id);
      } catch (err) {
        console.error('Failed to mark as processed (non-critical):', err);
        // Don't fail the whole transfer if we can't record the status
      }
    }

    console.log('=== TRANSFER COMPLETE ===', { 
      success: true, 
      message_id, 
      newStudentBalance: newStudentTokens,
      newTutorBalance: newTutorTokens
    });

    return NextResponse.json({ 
      success: true, 
      student: updatedStudent, 
      tutor: updatedTutor,
      newBalance: newStudentTokens
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = withRouteAuth(withCsrfProtection(transferCreditsHandler));
