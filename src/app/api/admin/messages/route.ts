import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/auth/adminAuth";

/**
 * Admin → student direct messaging.
 *
 * Lets an admin start (or continue) a direct in-app conversation with a
 * student straight from the admin panel — even if the student never
 * messaged an admin first. It reuses the normal `conversation` /
 * `conversation_participant` / `message` tables, so the message lands in
 * the student's regular Messages inbox and they can reply like any other
 * conversation.
 *
 * Access rules (per product decision):
 *   - Only the three admins (adminAuth.ADMIN_EMAILS) can call this.
 *   - An admin may only message a student who has active paid access
 *     (`users.has_access === true`). Students without access can't load
 *     their inbox, so a message to them would be invisible — we block it
 *     up front rather than silently dropping it.
 *
 * GET  /api/admin/messages?studentId=<id>  → the thread (may be empty)
 * POST /api/admin/messages  { studentId, content }  → send a message
 */

export const dynamic = "force-dynamic";

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Find a conversation that BOTH the admin and the student already belong
 * to. If several exist, return the most recently active one. Returns null
 * when they've never shared a conversation.
 */
async function findSharedConversation(
  supabase: SupabaseClient,
  adminId: string,
  studentId: string
): Promise<string | null> {
  const { data: adminParts } = await supabase
    .from("conversation_participant")
    .select("conversation_id")
    .eq("user_id", adminId);

  const adminConvIds = (adminParts || []).map((p) => p.conversation_id);
  if (adminConvIds.length === 0) return null;

  const { data: shared } = await supabase
    .from("conversation_participant")
    .select("conversation_id")
    .eq("user_id", studentId)
    .in("conversation_id", adminConvIds);

  const sharedIds = (shared || []).map((p) => p.conversation_id);
  if (sharedIds.length === 0) return null;

  const { data: convs } = await supabase
    .from("conversation")
    .select("id, updated_at")
    .in("id", sharedIds)
    .order("updated_at", { ascending: false })
    .limit(1);

  return convs?.[0]?.id || sharedIds[0];
}

/** Resolve a user's display name from whichever profile table holds it. */
async function resolveName(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: tp } = await supabase
    .from("tutor_profile")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (tp && (tp.first_name || tp.last_name)) {
    return `${tp.first_name || ""} ${tp.last_name || ""}`.trim();
  }

  const { data: sp } = await supabase
    .from("student_profile")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (sp && (sp.first_name || sp.last_name)) {
    return `${sp.first_name || ""} ${sp.last_name || ""}`.trim();
  }

  return null;
}

/**
 * The students an admin is allowed to message: students (non-tutors) with
 * active paid access. Students without access can't load their inbox, so
 * a message to them would be invisible — they're excluded from the picker.
 */
async function listMessageableStudents(
  supabase: SupabaseClient
): Promise<Array<{ id: string; name: string | null; email: string }>> {
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .eq("is_tutor", false)
    .eq("has_access", true);

  const rows = users || [];
  if (rows.length === 0) return [];

  const ids = rows.map((u) => u.id);
  const { data: profiles } = await supabase
    .from("student_profile")
    .select("id, first_name, last_name")
    .in("id", ids);

  const nameById: Record<string, string> = {};
  (profiles || []).forEach((p) => {
    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    if (name) nameById[p.id] = name;
  });

  return rows
    .map((u) => ({
      id: u.id,
      email: (u.email as string) || "",
      name: nameById[u.id] || null,
    }))
    .sort((a, b) =>
      (a.name || a.email || "")
        .toLowerCase()
        .localeCompare((b.name || b.email || "").toLowerCase())
    );
}

/** Best-effort realtime push so the student sees the message instantly. */
async function broadcast(
  supabase: SupabaseClient,
  message: Record<string, unknown>,
  conversationId: string
) {
  try {
    const channel = supabase.channel(
      `tutoring_session:conversation:${conversationId}`
    );
    await channel.subscribe();
    await channel.send({ type: "broadcast", event: "message", payload: message });
  } catch {
    // Delivery still works via the student's next inbox load — don't fail
    // the request just because the realtime push didn't land.
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  const supabase = serviceClient();

  // No studentId → return the list of students an admin may message
  // (students with active paid access). Used to populate the picker.
  if (!studentId) {
    const students = await listMessageableStudents(supabase);
    return NextResponse.json({ students });
  }

  const { data: student } = await supabase
    .from("users")
    .select("id, email, has_access")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const [adminName, studentName] = await Promise.all([
    resolveName(supabase, admin.id),
    resolveName(supabase, studentId),
  ]);

  const conversationId = await findSharedConversation(
    supabase,
    admin.id,
    studentId
  );

  let messages: Array<{
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    from_admin: boolean;
    sender_name: string;
  }> = [];

  if (conversationId) {
    const { data: msgs } = await supabase
      .from("message")
      .select("id, content, created_at, sender_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    messages = (msgs || []).map((m) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      sender_id: m.sender_id,
      from_admin: m.sender_id === admin.id,
      sender_name:
        m.sender_id === admin.id
          ? adminName || admin.email || "Admin"
          : studentName || student.email || "Student",
    }));
  }

  return NextResponse.json({
    conversationId,
    canMessage: !!student.has_access,
    adminName: adminName || admin.email,
    studentName: studentName,
    messages,
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { studentId?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const content =
    typeof body.content === "string" ? body.content.trim() : "";

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json(
      { error: "Message is too long (5000 character max)" },
      { status: 400 }
    );
  }
  if (studentId === admin.id) {
    return NextResponse.json(
      { error: "You can't message yourself" },
      { status: 400 }
    );
  }

  const supabase = serviceClient();

  const { data: student } = await supabase
    .from("users")
    .select("id, email, has_access")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (!student.has_access) {
    return NextResponse.json(
      {
        error:
          "This student doesn't have active paid access yet, so they can't receive messages.",
      },
      { status: 403 }
    );
  }

  let conversationId = await findSharedConversation(
    supabase,
    admin.id,
    studentId
  );

  // No existing conversation — create one and add both participants.
  if (!conversationId) {
    const now = new Date().toISOString();
    const { data: conv, error: convErr } = await supabase
      .from("conversation")
      .insert({ created_by: admin.id, updated_at: now })
      .select()
      .single();

    if (convErr || !conv) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }
    conversationId = conv.id;

    const { error: partErr } = await supabase
      .from("conversation_participant")
      .insert([
        { conversation_id: conversationId, user_id: admin.id, last_viewed_at: now },
        // student's last_viewed_at left null so the message shows as unread
        { conversation_id: conversationId, user_id: studentId, last_viewed_at: null },
      ]);

    if (partErr) {
      return NextResponse.json(
        { error: "Failed to set up the conversation" },
        { status: 500 }
      );
    }
  }

  // Guaranteed set past this point (found above or just created).
  if (!conversationId) {
    return NextResponse.json(
      { error: "Failed to resolve conversation" },
      { status: 500 }
    );
  }

  const { data: msg, error: msgErr } = await supabase
    .from("message")
    .insert({ conversation_id: conversationId, sender_id: admin.id, content })
    .select()
    .single();

  if (msgErr || !msg) {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }

  // Bump the conversation so it sorts to the top of the student's inbox.
  await supabase
    .from("conversation")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  await broadcast(supabase, msg, conversationId);

  const adminName = await resolveName(supabase, admin.id);

  return NextResponse.json({
    success: true,
    conversationId,
    message: {
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      sender_id: admin.id,
      from_admin: true,
      sender_name: adminName || admin.email || "Admin",
    },
  });
}
