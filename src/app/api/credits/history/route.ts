import { NextRequest, NextResponse } from "next/server";
import { withRouteAuth } from "@/lib/auth/validateRequest";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function historyHandler(req: NextRequest, user: any) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userId = user.id;
    const isStudent = user.role !== "tutor";

    // Fetch credit transfers (both sent and received)
    const { data: transfers, error: transferError } = await supabaseAdmin
      .from("processed_credit_requests")
      .select("*")
      .or(`student_id.eq.${userId},tutor_id.eq.${userId}`)
      .order("processed_at", { ascending: false });

    if (transferError) {
      console.error("Error fetching transfers:", transferError);
    }

    // Fetch completed sessions that had a cost
    const sessionFilter = isStudent ? "student_id" : "tutor_id";
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("id, name, subject, cost, status, scheduled_time, student_id, tutor_id, created_at")
      .eq(sessionFilter, userId)
      .in("status", ["completed", "accepted"])
      .not("cost", "is", null)
      .order("scheduled_time", { ascending: false });

    if (sessionError) {
      console.error("Error fetching sessions:", sessionError);
    }

    // Get user names for the transfers
    const userIds = new Set<string>();
    (transfers || []).forEach((t: any) => {
      if (t.student_id) userIds.add(t.student_id);
      if (t.tutor_id) userIds.add(t.tutor_id);
    });
    (sessions || []).forEach((s: any) => {
      if (s.student_id) userIds.add(s.student_id);
      if (s.tutor_id) userIds.add(s.tutor_id);
    });

    const { data: userProfiles } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name, name, email")
      .in("id", Array.from(userIds));

    const userMap: Record<string, string> = {};
    (userProfiles || []).forEach((u: any) => {
      userMap[u.id] = u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "Unknown";
    });

    // Build unified history
    const history: any[] = [];

    // Add transfers
    (transfers || []).forEach((t: any) => {
      const isOutgoing = t.student_id === userId;
      history.push({
        id: `transfer-${t.message_id || t.id}`,
        type: t.status === "declined" ? "transfer_declined" : isOutgoing ? "transfer_out" : "transfer_in",
        amount: t.amount || 0,
        date: t.processed_at,
        description: t.status === "declined"
          ? `Credit transfer declined`
          : isOutgoing
            ? `Credits transferred to ${userMap[t.tutor_id] || "Tutor"}`
            : `Credits received from ${userMap[t.student_id] || "Student"}`,
        otherParty: isOutgoing ? userMap[t.tutor_id] : userMap[t.student_id],
      });
    });

    // Add session costs
    (sessions || []).forEach((s: any) => {
      if (!s.cost || s.cost <= 0) return;
      history.push({
        id: `session-${s.id}`,
        type: isStudent ? "lesson_deduction" : "lesson_earning",
        amount: s.cost,
        date: s.scheduled_time || s.created_at,
        description: isStudent
          ? `Session: ${s.name || s.subject || "Tutoring session"}`
          : `Session with student: ${s.name || s.subject || "Tutoring session"}`,
        otherParty: isStudent ? userMap[s.tutor_id] : userMap[s.student_id],
      });
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ history, currentBalance: user.tokens || 0 });
  } catch (error) {
    console.error("Credit history error:", error);
    return NextResponse.json({ error: "Failed to fetch credit history" }, { status: 500 });
  }
}

export const GET = withRouteAuth(historyHandler);
