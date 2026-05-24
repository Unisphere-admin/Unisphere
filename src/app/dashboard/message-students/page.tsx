"use client";

/**
 * /dashboard/message-students — admin-only tab.
 *
 * Lets a platform admin start (or continue) a direct conversation with any
 * student who has active paid access, even if that student never messaged
 * an admin first. The message lands in the student's normal Messages inbox
 * and they can reply like any other conversation.
 *
 * Server-side, /api/admin/messages enforces the same admin gate, so this
 * page being client-rendered is not a security boundary on its own.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdminEmail } from "@/lib/auth/adminEmails";
import { Loader2, Search, Send, MessageSquare, ShieldAlert } from "lucide-react";

interface StudentItem {
  id: string;
  name: string | null;
  email: string;
}

interface ThreadMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  from_admin: boolean;
  sender_name: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initial(s: StudentItem) {
  return (s.name || s.email || "?").trim().charAt(0).toUpperCase();
}

export default function MessageStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const admin = isAdminEmail(user?.email);

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<StudentItem | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load the messageable-student list once we know the user is an admin.
  useEffect(() => {
    if (authLoading || !admin) return;
    setStudentsLoading(true);
    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setListError(d.error);
        else setStudents(d.students || []);
      })
      .catch((e) => setListError(e instanceof Error ? e.message : String(e)))
      .finally(() => setStudentsLoading(false));
  }, [authLoading, admin]);

  const loadThread = useCallback((studentId: string) => {
    setThreadLoading(true);
    setSendError(null);
    fetch(`/api/admin/messages?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setSendError(d.error);
        else setThread(d.messages || []);
      })
      .catch((e) => setSendError(e instanceof Error ? e.message : String(e)))
      .finally(() => setThreadLoading(false));
  }, []);

  const selectStudent = (s: StudentItem) => {
    setSelected(s);
    setThread([]);
    setDraft("");
    setSendError(null);
    loadThread(s.id);
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || sending || !selected) return;
    setSending(true);
    setSendError(null);
    try {
      const r = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selected.id, content }),
      });
      const d = await r.json();
      if (!r.ok || d.error) {
        setSendError(d.error || "Failed to send message");
        return;
      }
      setThread((prev) => [...prev, d.message as ThreadMessage]);
      setDraft("");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  // Keep the thread pinned to the newest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread, threadLoading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [students, query]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive/60 mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Admins only
        </h1>
        <p className="text-sm text-muted-foreground">
          This page is only available to Unisphere administrators.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Message Students
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start a direct conversation with any student who has paid access.
          They receive it in their Messages inbox and can reply.
        </p>
      </div>

      <div className="flex flex-col md:flex-row rounded-xl border border-border bg-card overflow-hidden h-[calc(100vh-13rem)] min-h-[460px]">
        {/* Student picker */}
        <aside className="md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {studentsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : listError ? (
              <p className="text-sm text-destructive px-4 py-6 text-center">
                {listError}
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-6 text-center">
                {students.length === 0
                  ? "No students with paid access yet."
                  : "No students match your search."}
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectStudent(s)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 border-b border-border/50 transition-colors ${
                    selected?.id === s.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {initial(s)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.name || s.email}
                    </p>
                    {s.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {s.email}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
            {studentsLoading
              ? "…"
              : `${students.length} student${
                  students.length === 1 ? "" : "s"
                } with paid access`}
          </div>
        </aside>

        {/* Conversation pane */}
        <section className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">
                Pick a student to message
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose someone from the list to start or continue a
                conversation.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                  {initial(selected)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {selected.name || selected.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selected.email}
                  </p>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/30"
              >
                {threadLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : thread.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    No messages yet. Send the first one below.
                  </p>
                ) : (
                  thread.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.from_admin ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.from_admin
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {m.from_admin ? "You" : m.sender_name} ·{" "}
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border p-3 bg-card">
                {sendError && (
                  <p className="text-xs text-destructive mb-2 px-1">
                    {sendError}
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    placeholder={`Message ${
                      selected.name || "this student"
                    }…`}
                    className="flex-1 resize-none text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    onClick={send}
                    disabled={sending || !draft.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                  Sent as {user?.name || "you"}. Press Enter to send,
                  Shift+Enter for a new line.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
