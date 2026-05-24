import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/auth/adminAuth";

/**
 * Summer Studio sign-ups.
 *
 * POST  — public. A visitor submits the Summer Studio interest form; the
 *         submission is saved to the summer_studio_signups table.
 * GET   — admin only. Returns every sign-up, newest first, for the
 *         /admin/summer-studio panel.
 *
 * Before this route existed the form discarded every submission, so any
 * earlier sign-ups were lost. This persists them properly.
 */

export const dynamic = "force-dynamic";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = asString(body.name);
  const email = asString(body.email);
  const phone = asString(body.phone);
  const school = asString(body.school);
  const notes = asString(body.notes);

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address" },
      { status: 400 }
    );
  }
  if (name.length > 200 || email.length > 320 || notes.length > 5000) {
    return NextResponse.json(
      { error: "One of your fields is too long" },
      { status: 400 }
    );
  }

  const { error } = await serviceClient()
    .from("summer_studio_signups")
    .insert({
      name,
      email,
      phone: phone || null,
      school: school || null,
      notes: notes || null,
    });

  if (error) {
    console.error("[summer-studio/signups] insert failed:", error);
    return NextResponse.json(
      { error: "We could not save your details. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await serviceClient()
    .from("summer_studio_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[summer-studio/signups] list failed:", error);
    return NextResponse.json(
      { error: "Failed to load sign-ups" },
      { status: 500 }
    );
  }

  return NextResponse.json({ signups: data || [] });
}
