import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/adminAuth";
import { createRouteHandlerClientWithCookies } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["essay-competition", "olympiad", "scholarship", "program", "extracurricular"];
const VALID_TRACKS = ["uk", "us", "both"];
const VALID_ACCENTS = ["indigo", "blue", "amber", "green", "emerald", "purple", "violet", "red", "rose", "teal"];

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createRouteHandlerClientWithCookies();
    const { data, error } = await supabase
      .from("opportunity")
      .select("*")
      .order("deadline", { ascending: true });

    if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    return NextResponse.json({ opportunities: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, organizer, type, track, deadline, deadline_note, description, details, external_url, accent, tags } = body;

    if (!name || !organizer || !type || !track || !deadline || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!VALID_TRACKS.includes(track)) return NextResponse.json({ error: "Invalid track" }, { status: 400 });

    const supabase = await createRouteHandlerClientWithCookies();
    const { data, error } = await supabase
      .from("opportunity")
      .insert({
        name,
        organizer,
        type,
        track,
        deadline,
        deadline_note: deadline_note || null,
        description,
        details: details || null,
        external_url: external_url || null,
        accent: VALID_ACCENTS.includes(accent) ? accent : "blue",
        tags: Array.isArray(tags) ? tags : [],
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    return NextResponse.json({ opportunity: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const allowed = ["name","organizer","type","track","deadline","deadline_note","description","details","external_url","accent","tags","is_active"];
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (fields[key] !== undefined) updateData[key] = fields[key];
    }

    const supabase = await createRouteHandlerClientWithCookies();
    const { data, error } = await supabase
      .from("opportunity")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    return NextResponse.json({ opportunity: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const supabase = await createRouteHandlerClientWithCookies();
    const { error } = await supabase.from("opportunity").delete().eq("id", id);

    if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
