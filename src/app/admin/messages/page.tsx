"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

/**
 * Admin /messages — flat feed of every recent platform message.
 *
 * Sibling of /admin/conversations. Same data source (the `message` table)
 * but displayed as a single chronological list rather than grouped by
 * conversation. Each row shows the sender, the recipient(s) (other
 * participants of the conversation), the timestamp, and the full
 * message body. Loads 100 at a time with a Load More button.
 */

interface Participant {
  email: string;
  name?: string;
  is_tutor?: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender: Participant;
  recipients: Participant[];
}

const PAGE_SIZE = 100;

function formatDateTime(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function participantLabel(p: Participant) {
  return p.name && p.name !== "" ? p.name : p.email;
}

function ParticipantChip({ p }: { p: Participant }) {
  return (
    <span
      className={`font-medium ${
        p.is_tutor ? "text-purple-700" : "text-blue-700"
      }`}
    >
      {participantLabel(p)}
    </span>
  );
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/dashboard?section=recent-messages&page=${pageNum}&limit=${PAGE_SIZE}`
      );
      const d = await res.json();
      const incoming: Message[] = d.messages || [];
      setMessages((prev) => (append ? [...prev, ...incoming] : incoming));
      setTotal(d.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const canLoadMore = messages.length < total;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total.toLocaleString()} messages on the platform — showing the most
          recent first
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No messages yet
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {messages.map((m) => (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="flex items-baseline gap-1.5 text-sm flex-wrap min-w-0">
                    <ParticipantChip p={m.sender} />
                    <span className="text-gray-300">→</span>
                    {m.recipients.length === 0 ? (
                      <span className="text-gray-400 italic">
                        no recipients
                      </span>
                    ) : (
                      m.recipients.map((r, i) => (
                        <span key={i} className="flex items-baseline gap-1.5">
                          <ParticipantChip p={r} />
                          {i < m.recipients.length - 1 && (
                            <span className="text-gray-300">,</span>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {formatDateTime(m.created_at)}
                  </p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {canLoadMore && (
          <div className="flex items-center justify-center px-4 py-4 border-t border-gray-100">
            <button
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchPage(next, true);
              }}
              disabled={loadingMore}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </span>
              ) : (
                `Load more (${total - messages.length} remaining)`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
