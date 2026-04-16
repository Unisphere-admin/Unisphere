import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// GET /api/goals?studentId=xxx
// Returns all active custom goals (with items) for a student.
// Accessible by the student themselves or any authenticated tutor.
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = req.nextUrl.searchParams.get("studentId") || user.id;
    const supabase = serviceClient();

    // Verify the requester is either the student or a tutor
    const { data: userRow } = await supabase
      .from("users")
      .select("is_tutor")
      .eq("id", user.id)
      .single();

    const isTutor = userRow?.is_tutor === true;
    const isOwnProfile = user.id === studentId;

    if (!isOwnProfile && !isTutor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: goals, error } = await supabase
      .from("user_custom_goals")
      .select(`
        id, title, description, track, icon, color,
        created_by, created_by_role, created_by_name, created_at,
        user_goal_items (
          id, title, due_date, description, is_completed, category, created_at
        )
      `)
      .eq("student_id", studentId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Goals fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goals: goals || [] });
  } catch (err) {
    console.error("Goals GET unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/goals
// Create a new custom goal.
// Body: { studentId?, title, description?, track, icon?, color? }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { studentId, title, description, track, icon, color } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const supabase = serviceClient();

    // Determine if tutor or student
    const { data: userRow } = await supabase
      .from("users")
      .select("is_tutor")
      .eq("id", user.id)
      .single();

    const isTutor = userRow?.is_tutor === true;
    const targetStudentId = studentId || user.id;

    // Students can only create goals for themselves
    if (!isTutor && targetStudentId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get creator's name (for tutor-created goals, show tutor name)
    let creatorName: string | null = null;
    if (isTutor) {
      const { data: tutorProfile } = await supabase
        .from("tutor_profile")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();
      if (tutorProfile) {
        creatorName = `${tutorProfile.first_name || ""} ${tutorProfile.last_name || ""}`.trim() || null;
      }
    }

    const { data: goal, error } = await supabase
      .from("user_custom_goals")
      .insert({
        student_id: targetStudentId,
        created_by: user.id,
        created_by_role: isTutor ? "tutor" : "student",
        created_by_name: creatorName,
        title: title.trim(),
        description: description?.trim() || null,
        track: track || "both",
        icon: icon || "Target",
        color: color || "blue",
      })
      .select(`
        id, title, description, track, icon, color,
        created_by, created_by_role, created_by_name, created_at,
        user_goal_items (
          id, title, due_date, description, is_completed, category, created_at
        )
      `)
      .single();

    if (error) {
      console.error("Goal create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goal });
  } catch (err) {
    console.error("Goals POST unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/goals
// Update a goal's title, description, track, icon, color.
// Body: { goalId, title?, description?, track?, icon?, color? }
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { goalId, title, description, track, icon, color } = body;

    if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });

    const supabase = serviceClient();

    // Verify ownership: must be the student or the original creator
    const { data: existing } = await supabase
      .from("user_custom_goals")
      .select("student_id, created_by")
      .eq("id", goalId)
      .single();

    if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const canEdit = existing.student_id === user.id || existing.created_by === user.id;
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (track !== undefined) updates.track = track;
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;

    const { data: goal, error } = await supabase
      .from("user_custom_goals")
      .update(updates)
      .eq("id", goalId)
      .select(`
        id, title, description, track, icon, color,
        created_by, created_by_role, created_by_name, created_at,
        user_goal_items (
          id, title, due_date, description, is_completed, category, created_at
        )
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goal });
  } catch (err) {
    console.error("Goals PUT unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/goals?goalId=xxx
// Soft-deletes a goal (sets is_active = false).
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goalId = req.nextUrl.searchParams.get("goalId");
    if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });

    const supabase = serviceClient();

    const { data: existing } = await supabase
      .from("user_custom_goals")
      .select("student_id, created_by")
      .eq("id", goalId)
      .single();

    if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const canDelete = existing.student_id === user.id || existing.created_by === user.id;
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("user_custom_goals")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", goalId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Goals DELETE unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
