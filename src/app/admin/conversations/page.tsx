"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
} from "lucide-react";

interface Participant {
  email: string;
  name?: string;
  is_tutor?: boolean;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  latestMessage: { content: string; created_at: string; sender_id: string } | null;
  latestMessageSender: Participant | null;
  messageCount: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender: { email: string; name?: string; is_tutor?: boolean };
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function participantLabel(p: Participant) {
  const name = p.name && p.name !== "" ? p.name : p.email;
  return name;
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 30;

  // Message viewer
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/admin/dashboard?section=conversations&page=${page}&limit=${limit}`
    )
      .then((r) => r.json())
      .then((d) => {
        setConversations(d.conversations || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const openConversation = (convo: Conversation) => {
    setSelectedConvo(convo);
    setMessagesLoading(true);
    fetch(
      `/api/admin/dashboard?section=conversation-messages&conversationId=${convo.id}`
    )
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(console.error)
      .finally(() => setMessagesLoading(false));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total.toLocaleString()} conversations on the platform
        </p>
      </div>

      <div className="flex gap-4">
        {/* Conversation list */}
        <div
          className={`${selectedConvo ? "w-1/2" : "w-full"} transition-all`}
        >
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors ${
                      selectedConvo?.id === c.id ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {c.participants.map((p, i) => (
                            <span key={i} className="text-sm">
                              <span
                                className={`font-medium ${p.is_tutor ? "text-purple-700" : "text-blue-700"}`}
                              >
                                {participantLabel(p)}
                              </span>
                              {i < c.participants.length - 1 && (
                                <span className="text-gray-300 mx-1">
                                  &
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                        {c.latestMessage && (
                          <p className="text-xs text-gray-400 truncate">
                            {c.latestMessageSender?.name ||
                              c.latestMessageSender?.email ||
                              ""}
                            : {c.latestMessage.content}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">
                          {formatDateTime(
                            c.latestMessage?.created_at || c.updated_at
                          )}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">
                          {c.messageCount} msgs
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message viewer panel */}
        {selectedConvo && (
          <div className="w-1/2">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-6">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-1.5 text-sm">
                    {selectedConvo.participants.map((p, i) => (
                      <span key={i}>
                        <span
                          className={`font-medium ${p.is_tutor ? "text-purple-700" : "text-blue-700"}`}
                        >
                          {participantLabel(p)}
                        </span>
                        {i < selectedConvo.participants.length - 1 && (
                          <span className="text-gray-300 mx-1">&</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Started {formatDate(selectedConvo.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedConvo(null)}
                  className="p-1.5 rounded hover:bg-gray-100"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {/* Messages */}
              <div className="max-h-[600px] overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">
                    No messages in this conversation
                  </p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="group">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span
                          className={`text-xs font-medium ${
                            m.sender.is_tutor
                              ? "text-purple-600"
                              : "text-blue-600"
                          }`}
                        >
                          {m.sender.name || m.sender.email}
                        </span>
                        <span className="text-[10px] text-gray-300">
                          {formatDateTime(m.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
