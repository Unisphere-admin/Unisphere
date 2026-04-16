import { NextRequest, NextResponse } from "next/server";
import { withRouteAuth } from "@/lib/auth/validateRequest";
import { withCsrfProtection } from "@/lib/csrf-next";
import { createClient } from "@supabase/supabase-js";

// Force dynamic
export const dynamic = "force-dynamic";

async function transferCreditsHandler(req: NextRequest, user: any) {
  try {
    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json();
    const { message_id, tutor_id, amount } = body || {};


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
        return NextResponse.json({ 
          error: "This credit request has already been processed",
          alreadyProcessed: true 
        }, { status: 409 });
      }
    }

    // ============================================================================
    // CRITICAL: Use atomic transfer function to prevent race conditions
    // This ensures both debit and credit happen atomically with proper locking
    // ============================================================================


    const { data: transferResult, error: transferError } = await supabaseAdmin
      .rpc('atomic_transfer_credits', {
        p_from_user_id: studentId,
        p_to_user_id: tutor_id,
        p_credits: transferAmount
      });

    if (transferError) {
      console.error('❌ Atomic transfer failed:', transferError);
      return NextResponse.json({
        error: "Credit transfer failed",
        details: transferError.message
      }, { status: 500 });
    }

    const result = transferResult[0];

    // Check if transfer was successful
    if (!result.success) {
      console.error('❌ Transfer validation failed:', result.error_message);
      return NextResponse.json({
        error: result.error_message || "Transfer failed"
      }, { status: 400 });
    }


    // Fetch profile names for audit trail (non-critical)
    const { data: studentProf } = await supabaseAdmin
      .from("users")
      .select("first_name,last_name")
      .eq("id", studentId)
      .maybeSingle();
    const { data: tutorProf } = await supabaseAdmin
      .from("users")
      .select("first_name,last_name")
      .eq("id", tutor_id)
      .maybeSingle();

    const studentFirst = studentProf?.first_name || null;
    const studentLast = studentProf?.last_name || null;
    const tutorFirst = tutorProf?.first_name || null;
    const tutorLast = tutorProf?.last_name || null;

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
      } catch (err) {
        console.error('Failed to mark as processed (non-critical):', err);
        // Don't fail the whole transfer if we can't record the status
      }
    }


    return NextResponse.json({
      success: true,
      student: {
        id: studentId,
        tokens: result.from_new_balance,
        first_name: studentFirst,
        last_name: studentLast
      },
      tutor: {
        id: tutor_id,
        tokens: result.to_new_balance,
        first_name: tutorFirst,
        last_name: tutorLast
      },
      newBalance: result.from_new_balance
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = withRouteAuth(withCsrfProtection(transferCreditsHandler));
