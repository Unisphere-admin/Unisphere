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

// POST /api/goals/items
// Add an item to an existing goal.
// Body: { goalId, title, due_date?, description?, category? }
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
    const { goalId, title, due_date, description, category } = body;

    if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const supabase = serviceClient();

    // Verify the goal exists and the user can add to it
    const { data: goal } = await supabase
      .from("user_custom_goals")
      .select("student_id, created_by")
      .eq("id", goalId)
      .eq("is_active", true)
      .single();

    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const canEdit = goal.student_id === user.id || goal.created_by === user.id;
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: item, error } = await supabase
      .from("user_goal_items")
      .insert({
        goal_id: goalId,
        student_id: goal.student_id,
        title: title.trim(),
        due_date: due_date || null,
        description: description?.trim() || null,
        category: category || "deadline",
        is_completed: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("Goals items POST unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/goals/items
// Update an item (title, date, description, category, is_completed).
// Body: { itemId, ...fields }
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
    const { itemId, title, due_date, description, category, is_completed } = body;

    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const supabase = serviceClient();

    // Verify ownership via the goal
    const { data: item } = await supabase
      .from("user_goal_items")
      .select("student_id, goal_id")
      .eq("id", itemId)
      .single();

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const { data: goal } = await supabase
      .from("user_custom_goals")
      .select("created_by")
      .eq("id", item.goal_id)
      .single();

    const canEdit = item.student_id === user.id || goal?.created_by === user.id;
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (due_date !== undefined) updates.due_date = due_date || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (category !== undefined) updates.category = category;
    if (is_completed !== undefined) updates.is_completed = is_completed;

    const { data: updated, error } = await supabase
      .from("user_goal_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("Goals items PUT unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/goals/items?itemId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const itemId = req.nextUrl.searchParams.get("itemId");
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const supabase = serviceClient();

    const { data: item } = await supabase
      .from("user_goal_items")
      .select("student_id, goal_id")
      .eq("id", itemId)
      .single();

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const { data: goal } = await supabase
      .from("user_custom_goals")
      .select("created_by")
      .eq("id", item.goal_id)
      .single();

    const canDelete = item.student_id === user.id || goal?.created_by === user.id;
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("user_goal_items")
      .delete()
      .eq("id", itemId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Goals items DELETE unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
