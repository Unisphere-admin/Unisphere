import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/adminAuth";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/deadlines
 * Returns all deadlines (active and inactive) for admin management.
 * Public variant: GET /api/deadlines returns only active ones.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createRouteHandlerClientWithCookies();

    const { data, error } = await supabase
      .from("deadline")
      .select("*")
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

/**
 * POST /api/admin/deadlines
 * Create a new deadline or competition.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, due_date, category, link } = body;

    if (!title || !due_date) {
      return NextResponse.json(
        { error: "Title and due date are required" },
        { status: 400 }
      );
    }

    const validCategories = [
      "deadline",
      "essay_competition",
      "scholarship",
      "application",
      "event",
      "other",
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClientWithCookies();

    const { data, error } = await supabase
      .from("deadline")
      .insert({
        title,
        description: description || null,
        due_date,
        category: category || "deadline",
        link: link || null,
        is_active: true,
        created_by: admin.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating deadline:", error);
      return NextResponse.json(
        { error: "Failed to create deadline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deadline: data }, { status: 201 });
  } catch (err) {
    console.error("Deadlines POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/deadlines
 * Update an existing deadline.
 */
export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, description, due_date, category, link, is_active } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Deadline ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClientWithCookies();

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (category !== undefined) updateData.category = category;
    if (link !== undefined) updateData.link = link;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from("deadline")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating deadline:", error);
      return NextResponse.json(
        { error: "Failed to update deadline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deadline: data });
  } catch (err) {
    console.error("Deadlines PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/deadlines
 * Soft-delete a deadline (sets is_active = false).
 */
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Deadline ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClientWithCookies();

    const { error } = await supabase
      .from("deadline")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting deadline:", error);
      return NextResponse.json(
        { error: "Failed to delete deadline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Deadlines DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
