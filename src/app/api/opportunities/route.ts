import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/opportunities
 * Returns all active opportunities for authenticated users.
 * Sorted by deadline ascending. Fields are mapped to camelCase
 * to match the frontend Opportunity interface.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClientWithCookies();

    const { data, error } = await supabase
      .from("opportunity")
      .select("*")
      .eq("is_active", true)
      .order("deadline", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
    }

    // Map snake_case DB fields to camelCase to match the frontend Opportunity interface
    const opportunities = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      organizer: row.organizer,
      type: row.type,
      track: row.track,
      deadline: row.deadline,
      deadlineNote: row.deadline_note ?? undefined,
      description: row.description,
      details: row.details ?? undefined,
      externalUrl: row.external_url ?? undefined,
      accent: row.accent,
      tags: row.tags ?? [],
    }));

    return NextResponse.json({ opportunities });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
