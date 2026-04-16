import { NextRequest, NextResponse } from "next/server";
import { withRouteAuth } from "@/lib/auth/validateRequest";
import { createClient } from "@supabase/supabase-js";

// Force dynamic
export const dynamic = "force-dynamic";

async function checkStatusHandler(req: NextRequest, user: any) {
  try {
    if (req.method !== "GET") {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { searchParams } = new URL(req.url);
    const message_id = searchParams.get("message_id");


    if (!message_id) {
      return NextResponse.json({ error: "Missing message_id" }, { status: 400 });
    }

    // Use service role client to check transaction
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if transaction exists for this message
    const { data, error } = await supabaseAdmin
      .from("processed_credit_requests")
      .select("message_id, processed_at, amount, status")
      .eq("message_id", message_id)
      .maybeSingle();


    if (error) {
      console.error("Error checking transaction:", error);
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ 
      exists: !!data,
      status: data?.status || null,
      transaction: data 
    });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ exists: false });
  }
}

export const GET = withRouteAuth(checkStatusHandler);
