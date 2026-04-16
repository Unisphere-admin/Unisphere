import { NextRequest, NextResponse } from "next/server";
import { AuthUser } from "@/lib/auth/protectResource";
import { withRouteAuth } from "@/lib/auth/validateRequest";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/deadlines
 * Returns all active deadlines for authenticated users (students and tutors).
 * Sorted by due date ascending (soonest first).
 */
async function getDeadlinesHandler(
  req: NextRequest,
  user: AuthUser
): Promise<NextResponse> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();

    const { data, error } = await supabase
      .from("deadline")
      .select("id, title, description, due_date, category, link, created_at")
      .eq("is_active", true)
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching deadlines:", error);
      return NextResponse.json(
        { error: "Failed to fetch deadlines" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deadlines: data || [] });
  } catch (err) {
    console.error("Deadlines GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRouteAuth(getDeadlinesHandler);
