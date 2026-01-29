"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useTransition,
} from "react";
import Link from "next/link";
import {
  redirect,
  useSearchParams,
  useRouter,
  usePathname,
} from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessageContext";
import { useSessions } from "@/context/SessionContext";
import { useRealtime } from "@/context/RealtimeContext";
import {
  Search,
  Send,
  User,
  Calendar,
  Loader2,
  ChevronLeft,
  MoreVertical,
  LayoutDashboard,
  AlertTriangle,
  Check,
  CheckCheck,
  AlertCircle,
  MessageSquare,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  SessionRequestCard,
  parseSessionRequest,
} from "@/components/SessionRequestCard";
import { CreditRequestCard } from "@/components/CreditRequestCard";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  validateText,
  sanitizeInput,
  checkForMaliciousContent,
  messageSchema,
} from "@/lib/validation";
import {
  getCsrfTokenFromStorage,
  CSRF_HEADER_NAME,
  useCsrfToken,
} from "@/lib/csrf/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

// Define interface for messages returned from API
interface Message {
  id: string;
  content: string;
  conversation_id: string;
  sender_id: string;
  created_at?: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
  status?: "sending" | "sent" | "delivered" | "error";
  // For UI tracking
  isSessionRequest?: boolean;
  pendingSessionCreation?: boolean;
  sessionRequest?: {
    id?: string;
    title: string;
    scheduledFor: string;
    conversationId: string;
    messageId: string;
    studentId?: string;
    tutorId?: string;
    studentReady?: boolean;
    tutorReady?: boolean;
    status?: "requested" | "accepted" | "started" | "ended" | "cancelled";
    tokens?: number;
  };
}

// Define interface for session objects
interface ActiveSession {
  id: string;
  message_id?: string | null;
  name?: string | null;
  scheduled_for?: string | null;
  status?: string;
  tutor_ready?: boolean;
  student_ready?: boolean;
  tutor_id?: string;
  student_id?: string;
  conversation_id?: string;
  cost?: number | null;
  created_at: string; // Required field
  updated_at?: string;
}

// Update the StudentProfileData interface to include all fields from the database
interface StudentProfileData {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  intended_universities?: string;
  intended_major?: string;
  current_subjects?: string[] | string;
  bio?: string;
  // Add all additional fields from the student_profile table
  a_levels?: any[];
  ib_diploma?: any[];
  igcse?: any[];
  spm?: any[];
  extracurricular_activities?: any[];
  awards?: any[];
  application_cycle?: string;
  countries_to_apply?: string;
  universities_to_apply?: string;
  planned_admissions_tests?: string;
  completed_admissions_tests?: string;
  planned_admissions_support?: string;
  university_other_info?: string;
  age?: string;
  year?: string;
  previous_schools?: string[] | string;
  school_name?: string;
}

// Add a custom type for session items that will be displayed in the messages list
interface SessionItem {
  id: string;
  type: "session"; // To identify it as a session vs a message
  display_order: string; // Using created_at value for sorting in message list
  session: ActiveSession; // The actual session data
}

// Create a standalone UnreadBadge component
const UnreadBadge = ({
  conversation,
  messages,
  userId,
  selectedConversationId,
}: {
  conversation: any;
  messages: any[];
  userId: string;
  selectedConversationId: string | null;
}) => {
  // Never show unread badge for the selected conversation
  if (conversation.id === selectedConversationId) {
    return null;
  }

  // Find current user's participant entry to get last_viewed_at
  const currentUserParticipant = conversation.participants?.find(
    (p: any) => p.user_id === userId
  );

  // Extract the last_viewed_at timestamp
  const lastViewedAt = currentUserParticipant?.last_viewed_at;

  // Compute unread count
  let unreadCount = 0;

  // First check if we have messages loaded
  if (messages && messages.length > 0) {
    // If last_viewed_at is unknown, count all messages not from the current user as unread
    if (!lastViewedAt) {
      unreadCount = messages.filter((msg) => msg.sender_id !== userId).length;
    } else {
      // Count messages after the last_viewed_at timestamp and not from current user
      const lastViewedTime = new Date(lastViewedAt).getTime();
      unreadCount = messages.filter((msg) => {
        const messageTime = new Date(msg.created_at || msg.timestamp).getTime();
        return messageTime > lastViewedTime && msg.sender_id !== userId;
      }).length;
    }
  } else if (conversation.unreadCount && conversation.unreadCount > 0) {
    // If no messages are loaded but conversation has unreadCount, use that
    unreadCount = conversation.unreadCount;
  } else if (
    !lastViewedAt &&
    conversation.last_message &&
    conversation.last_message.sender_id !== userId
  ) {
    // If no last_viewed_at and there's a last message not from the user, count it as unread
    unreadCount = 1;
  }

  // If no unread messages, don't show anything
  if (unreadCount <= 0) return null;

  return (
    <div
      className="flex items-center ml-auto"
      data-testid={`unread-badge-count-${unreadCount}`}
    >
      <div className="bg-primary text-primary-foreground rounded-full min-w-6 h-6 flex items-center justify-center text-xs font-medium shadow-md px-1.5 border border-primary/20 animate-in fade-in">
        {unreadCount > 99 ? "99+" : unreadCount}
      </div>
    </div>
  );
};

export default function MessagesPage() {
  const { user } = useAuth();
  const {
    conversations,
    messages,
    loading,
    loadingMessages,
    selectedConversationId,
    setSelectedConversationId,
    currentConversation,
    sendMessage,
    hasUnreadMessages,
    markConversationAsRead,
    setUserTyping,
    isUserTyping,
    typingStates,
    refreshMessages,
    isTempConversation,
  } = useMessages()!;

  const { sessions, refreshSessions } = useSessions();

  // Add sessionItems state here at the top of the component
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);

  const { fetchCsrfToken } = useCsrfToken();

  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track initial page load status to control loading indicators
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Keep a stable reference to conversations to prevent flickering
  const conversationsRef = useRef<any[]>([]);

  const offsetMinutes = new Date().getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;

  // Update the ref when conversations change but aren't empty
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      conversationsRef.current = conversations;
    }
  }, [conversations]);

  // Get the most stable version of conversations - either current state or ref
  const stableConversations =
    conversations.length > 0 ? conversations : conversationsRef.current;

  // Track conversations that have had their messages loaded to prevent redundant API calls
  const loadedConversationsRef = useRef<Set<string>>(new Set());

  // Add a flag to prevent concurrent requests for the same conversation
  const fetchInProgressRef = useRef<{ [conversationId: string]: boolean }>({});

  // Effect to set initial load status to false after the first load
  useEffect(() => {
    if (!loading && stableConversations.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, stableConversations, isInitialLoad]);

  // Get URL query parameters
  const conversationId = searchParams?.get("conversationId") || null;
  const messageId = searchParams?.get("messageId") || null;
  const sessionId = searchParams?.get("sessionId") || null;

  // Message element refs map to track message elements by ID
  const messageElementRefs = useRef<{ [key: string]: HTMLDivElement | null }>(
    {}
  );

  // Get realtime context
  const {
    subscribeToConversation: subscribeToConversationOriginal,
    broadcastTypingIndicator,
    unsubscribeFromConversation,
  } = useRealtime();

  // Track subscribed conversations to prevent redundant subscriptions
  const subscribedConversationsRef = useRef<Set<string>>(new Set());

  // Memoize the subscription function to prevent redundant API calls
  const subscribeToConversation = useCallback(
    (conversationId: string) => {
      // Check if already subscribed to this conversation
      if (subscribedConversationsRef.current.has(conversationId)) {
        return null;
      }

      // Mark as subscribed locally before making the API call
      subscribedConversationsRef.current.add(conversationId);
      return subscribeToConversationOriginal(conversationId);
    },
    [subscribeToConversationOriginal]
  );

  // Save the scroll position before updates
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);

  // Track if a specific message ID is being requested
  const isJumpingToSpecificMessage = useRef<boolean>(false);

  // Save scroll position before updates
  const saveScrollPosition = () => {
    if (scrollAreaRef.current) {
      savedScrollPosition.current = scrollAreaRef.current.scrollTop;
    }
  };

  // Restore scroll position after updates (unless scrolling to a specific message)
  useLayoutEffect(() => {
    if (scrollAreaRef.current && !isJumpingToSpecificMessage.current) {
      scrollAreaRef.current.scrollTop = savedScrollPosition.current;
    }
  }, [messages]);

  // Force refresh sessions when the component mounts
  useEffect(() => {
    refreshSessions(); // Keep this initial refresh for page load
  }, [refreshSessions]);

  // Add an effect to update sessionItems when sessions change
  useEffect(() => {
    if (!selectedConversationId || !sessions.length) return;

    // Filter sessions for the current conversation
    const sessionsForConversation = sessions.filter(
      (session) => session.conversation_id === selectedConversationId
    );

    // Sort sessions by created_at to ensure chronological ordering
    const sortedSessions = [...sessionsForConversation].sort((a, b) => {
      // Always use created_at for sorting, as it's guaranteed to exist
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });

    // Map sessions to a format compatible with message display
    const newSessionItems = sortedSessions.map((session) => ({
      id: `session-${session.id}`,
      type: "session" as const,
      display_order: session.created_at || new Date().toISOString(),
      session,
    })) as SessionItem[];

    // Check if we have new sessions
    const hasNewSessions = newSessionItems.length > sessionItems.length;

    setSessionItems(newSessionItems);

    // If we have new sessions and user is at the bottom, scroll to bottom
    if (
      hasNewSessions &&
      shouldAutoScrollRef.current &&
      messagesEndRef.current
    ) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [sessions, selectedConversationId, sessionItems.length]);

  // Update the effect that handles URL parameters
  useEffect(() => {
    // Check for temp-to-real conversation mappings first
    const checkTempToRealConversions = () => {
      if (typeof window === "undefined") return null;

      try {
        const conversionMap = JSON.parse(
          localStorage.getItem("tempToRealConversions") || "{}"
        );
        if (Object.keys(conversionMap).length === 0) return null;

        // Get conversation ID from URL - could be either 'conversationId' or 'conversation'
        const urlConversationId =
          conversationId || searchParams?.get("conversation");

        // If we have a selected conversation that's in the map, redirect to the real one
        if (urlConversationId && conversionMap[urlConversationId]) {
          const realId = conversionMap[urlConversationId];

          // Update URL to use the real ID
          router.replace(`/dashboard/messages?conversationId=${realId}`, {
            scroll: false,
          });

          // Delete this mapping after using it
          delete conversionMap[urlConversationId];
          localStorage.setItem(
            "tempToRealConversions",
            JSON.stringify(conversionMap)
          );

          return realId;
        }

        // Clean up orphaned mappings - if the temp conversation doesn't exist anymore
        if (typeof window !== "undefined") {
          try {
            const tempConvos = JSON.parse(
              localStorage.getItem("tempConversations") || "{}"
            );
            let hasOrphanedMappings = false;

            // Check each mapping to see if the temp conversation still exists
            Object.keys(conversionMap).forEach((tempId) => {
              if (!tempConvos[tempId]) {
                delete conversionMap[tempId];
                hasOrphanedMappings = true;
              }
            });

            // Save cleaned up mappings
            if (hasOrphanedMappings) {
              if (Object.keys(conversionMap).length > 0) {
                localStorage.setItem(
                  "tempToRealConversions",
                  JSON.stringify(conversionMap)
                );
              } else {
                localStorage.removeItem("tempToRealConversions");
              }
            }
          } catch (e) {}
        }

        return null;
      } catch (e) {
        localStorage.removeItem("tempToRealConversions"); // Clear potentially corrupted data
        return null;
      }
    };

    // Check for redirects first
    const realConversationId = checkTempToRealConversions();
    if (realConversationId) {
      return; // Skip the rest of this effect
    }

    // If conversationId is provided in URL, set it as the selected conversation
    if (conversationId && conversationId !== selectedConversationId) {
      // Check if this conversation exists in our list
      const conversationExists = stableConversations.some(
        (c: any) => c.id === conversationId
      );

      // Set the selected conversation ID regardless
      // This allows it to be selected even if the conversations are still loading
      setSelectedConversationId(conversationId);

      // If the conversation doesn't exist in our current list and we're not in loading state,
      // try to fetch the specific conversation directly
      if (!conversationExists && !loading && stableConversations.length > 0) {
        // Trigger direct fetch for the specific conversation ID
        const fetchSpecificConversation = async () => {
          try {
            // This will both fetch the conversation and its messages
            await refreshMessages(conversationId);
          } catch (err) {}
        };

        fetchSpecificConversation();
      }
    }
  }, [
    conversationId,
    stableConversations,
    selectedConversationId,
    setSelectedConversationId,
    router,
    loading,
    refreshMessages,
  ]);

  // Add effect to clean up temp conversations when the page loads
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for expired temporary conversations
    try {
      const stored = localStorage.getItem("tempConversations");
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const TEMP_CONVERSATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
        let hasChanges = false;

        Object.keys(parsed).forEach((key) => {
          const createdAtDate = new Date(parsed[key].createdAt);
          const age = now - createdAtDate.getTime();

          if (age > TEMP_CONVERSATION_EXPIRY_MS) {
            delete parsed[key];
            hasChanges = true;
          }
        });

        if (hasChanges) {
          if (Object.keys(parsed).length > 0) {
            localStorage.setItem("tempConversations", JSON.stringify(parsed));
          } else {
            localStorage.removeItem("tempConversations");
          }
        }
      }
    } catch (e) {}
  }, []);

  // Effect to log when we're handling conversation ID changes
  useEffect(() => {
    if (selectedConversationId) {
      // Only load messages if we haven't loaded them before
      // This prevents redundant API calls
      if (!loadedConversationsRef.current.has(selectedConversationId)) {
        loadedConversationsRef.current.add(selectedConversationId);
      } else {
      }
    }
  }, [selectedConversationId]);

  // Scroll to specific message when messages are loaded and message ID is provided
  useEffect(() => {
    if (
      messageId &&
      selectedConversationId &&
      messages[selectedConversationId] &&
      !loadingMessages
    ) {
      isJumpingToSpecificMessage.current = true;

      // Find the message element and scroll to it
      const messageElement = messageElementRefs.current[messageId];
      if (messageElement) {
        setTimeout(() => {
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          // Highlight the message temporarily
          messageElement.classList.add(
            "bg-yellow-100",
            "dark:bg-yellow-900/30"
          );
          setTimeout(() => {
            messageElement.classList.remove(
              "bg-yellow-100",
              "dark:bg-yellow-900/30"
            );
            isJumpingToSpecificMessage.current = false;
          }, 2000);
        }, 500);
      } else {
        isJumpingToSpecificMessage.current = false;
      }
    }
  }, [messageId, selectedConversationId, messages, loadingMessages]);

  // Find session by ID and scroll to its message
  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      // Find the session in our sessions array
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        // Set the conversation and message IDs
        setSelectedConversationId(session.conversation_id);
      }
    }
  }, [sessionId, sessions, setSelectedConversationId]);

  // Local state for the UI
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  // Pending attachments selected but not yet uploaded
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Session scheduling state
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionCost, setSessionCost] = useState<number>(0);
  const [isSchedulingSession, setIsSchedulingSession] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  // Credit request dialog (tutors can request credits without creating a session/call)
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditTitle, setCreditTitle] = useState("");
  const [creditAmount, setCreditAmount] = useState<number>(0);

  // Typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add a ref to track previous message counts by conversation
  const previousMessageCountRef = useRef<{ [conversationId: string]: number }>(
    {}
  );

  // Redirect if not logged in
  if (!user) {
    redirect("/login");
  }

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    return stableConversations.filter((convo: any) =>
      convo.participant?.display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [stableConversations, searchQuery]);

  // Add a function to determine if the user is currently scrolled to bottom
  const isScrolledToBottom = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      return Math.abs(scrollHeight - scrollTop - clientHeight) < 10; // Allow small margin of error
    }
    return false;
  };

  // Add a ref to track if we should auto-scroll
  const shouldAutoScrollRef = useRef<boolean>(true);

  // Update the scroll handler to check if user was at bottom
  const handleScroll = () => {
    saveScrollPosition();
    // Update auto-scroll behavior based on current scroll position
    shouldAutoScrollRef.current = isScrolledToBottom();
  };

  // Modify the useEffect that handles messages changes to respect user's scroll position
  useEffect(() => {
    // Only auto-scroll if user was already at the bottom or it's the initial load
    if (
      messagesEndRef.current &&
      !messageId &&
      !sessionId &&
      !isJumpingToSpecificMessage.current
    ) {
      const isInitialLoad =
        selectedConversationId &&
        messages[selectedConversationId]?.length > 0 &&
        !previousMessageCountRef.current[selectedConversationId];

      // Update the message count for this conversation
      if (selectedConversationId) {
        previousMessageCountRef.current[selectedConversationId] =
          messages[selectedConversationId]?.length || 0;
      }

      // Only scroll if:
      // 1. It's the initial load OR
      // 2. The user was already at the bottom
      if (isInitialLoad || shouldAutoScrollRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: isInitialLoad ? "auto" : "smooth",
        });
      }
    }
  }, [messages, messageId, sessionId, selectedConversationId]);

  // Conversation read state is now handled directly in the onClick handler when selecting a conversation

  // Effect to subscribe to realtime updates when conversation changes
  useEffect(() => {
    // Create a cleanup flag to ensure we don't update state after unmount
    let isActive = true;
    let currentChannels: { [id: string]: any } = {};

    if (selectedConversationId) {
      // Call subscribeToConversation which handles subscription internally
      // This returns the channel object now
      const channel = subscribeToConversation(selectedConversationId);
      // Only store valid channels
      if (channel !== null && channel !== undefined) {
        currentChannels[selectedConversationId] = channel;
      }
    }

    // Only unsubscribe when the component unmounts, not when selectedConversationId changes
    return () => {
      isActive = false;

      // Only perform cleanup when component unmounts or user logs out
      // Skip if we're just changing conversations
      if (!user) {
        Object.keys(currentChannels).forEach((conversationId) => {
          unsubscribeFromConversation(conversationId);
        });
      }
    };
  }, [
    selectedConversationId,
    user,
    subscribeToConversation,
    unsubscribeFromConversation,
  ]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!messageText.trim()) return; // Don't send empty messages

    // Validate selected conversation ID
    if (!selectedConversationId) {
      toast({
        variant: "destructive",
        title: "No conversation selected",
        description: "Please select a conversation before sending a message",
      });
      return;
    }

    // Validate that user is logged in
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not logged in",
        description: "You must be logged in to send messages",
      });
      return;
    }

    // Validate message content
    try {
      // First pass validation with basic sanitization
      const validationResult = validateText(messageText, {
        min: 1,
        max: 5000,
        allowHtml: false,
        trim: true,
      });

      if (!validationResult.valid) {
        toast({
          variant: "destructive",
          title: "Invalid message",
          description: validationResult.error || "Please enter a valid message",
        });
        return;
      }

      // Check for potentially malicious content
      if (checkForMaliciousContent(validationResult.value)) {
        toast({
          variant: "destructive",
          title: "Invalid content",
          description: "Your message contains invalid content",
        });
        return;
      }

      const sanitizedMessage = validationResult.value;

      // Continue with sending the message
      const content = sanitizedMessage;

      // If there are pending attachments, upload them first
      let attachmentPayload: Array<any> = [];
      if (pendingAttachments && pendingAttachments.length > 0) {
        setIsUploadingAttachments(true);
        try {
          const uploads = await Promise.all(
            pendingAttachments.map(async (file) => {
              const form = new FormData();
              form.append("file", file);
              const res = await fetch("/api/uploads", {
                method: "POST",
                body: form,
                credentials: "include",
              });
              if (!res.ok) {
                const err = await res
                  .json()
                  .catch(() => ({ error: "Upload failed" }));
                throw new Error(err.error || "Upload failed");
              }
              const data = await res.json();
              return data;
            })
          );

          attachmentPayload = uploads.map((u) => ({
            name: u.name,
            path: u.path,
            url: u.url,
            size: u.size,
            mime: u.mime,
          }));
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: err?.message || "One or more files failed to upload",
          });
          setIsUploadingAttachments(false);
          return;
        } finally {
          setIsUploadingAttachments(false);
        }
      }

      // Clear the input immediately for a snappy UI
      setMessageText("");

      // Clear typing indicator
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      broadcastTypingIndicator(selectedConversationId, false);

      // Send the message
      try {
        const sentMessage = await sendMessage(
          selectedConversationId,
          content,
          undefined,
          attachmentPayload
        );

        // Ensure the messages array exists for this conversation
        // This is important for new conversations that might not have messages yet
        if (!messages[selectedConversationId]) {
          refreshMessages(selectedConversationId);
        }

        // Clear pending attachments on success
        setPendingAttachments([]);

        // Scroll to bottom after sending
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } catch (error) {
        // Reset the message text so the user can try again
        setMessageText(content);

        // Show a more descriptive error message
        let errorMessage = "Please try again later.";
        if (error instanceof Error) {
          if (error.message.includes("Conversation ID")) {
            errorMessage =
              "Invalid conversation. Please reload the page and try again.";
          } else if (
            error.message.includes("premium") ||
            error.message.includes("access")
          ) {
            errorMessage = "Premium access required to send messages.";
          } else if (
            error.message.includes("authenticated") ||
            error.message.includes("login")
          ) {
            errorMessage = "You must be logged in to send messages.";
          } else {
            errorMessage = error.message;
          }
        }

        toast({
          variant: "destructive",
          title: "Failed to send message",
          description: errorMessage,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to process message",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  // Schedule a session
  const handleScheduleSession = async () => {
    if (!selectedConversationId || !user || !currentConversation) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required session information",
      });
      return;
    }

    setIsSchedulingSession(true);

    try {
      // Find the other participant in the conversation
      const otherParticipant = currentConversation.participants.find(
        (p) => p.user_id !== user.id
      );

      if (!otherParticipant) {
        throw new Error("Could not identify the conversation participant");
      }

      // Create session request directly - no message needed
      const response = await fetch("/api/tutoring-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          student_id: otherParticipant.user_id,
          tutor_id: user.id,
          scheduled_for: new Date(
            `${sessionDate}T${sessionTime}:00`
          ).toISOString(),
          name: sessionTitle,
          status: "requested",
          cost: sessionCost,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to schedule session: ${
            errorData.error || "Unknown error"
          }`,
        });
        setIsSchedulingSession(false);
        return;
      }

      // Session created successfully
      setSessionTitle("");
      setSessionDate("");
      setSessionTime("");
      setShowSessionDialog(false);
      setIsSchedulingSession(false);
      toast({
        title: "Success",
        description: "Session scheduled successfully!",
      });

      // Refresh data to show the new session - force refresh sessions
      await refreshSessions();

      // Scroll to bottom after creating the session
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          shouldAutoScrollRef.current = true;
        }
      }, 300); // Slightly longer delay to ensure sessions are loaded
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `${
          error instanceof Error ? error.message : "Failed to schedule session"
        }`,
      });
      setIsSchedulingSession(false);
    }
  };

  // Use a useLayoutEffect to immediately scroll to bottom on first render of messages
  // This runs synchronously after DOM updates but before browser paint
  useLayoutEffect(() => {
    if (
      selectedConversationId &&
      (messages[selectedConversationId]?.length > 0 ||
        sessionItems.length > 0) &&
      !messageId &&
      !sessionId &&
      !isJumpingToSpecificMessage.current
    ) {
      // Directly scroll to bottom without animation
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });

        // Set flag for auto-scrolling since user hasn't manually scrolled yet
        shouldAutoScrollRef.current = true;
      }
    }
  }, [selectedConversationId, messages, sessionItems, messageId, sessionId]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageText(value);

    // Don't send typing events for empty input when backspacing
    if (!isTyping && value.length > 0) {
      // User started typing
      setIsTyping(true);
      if (selectedConversationId) {
        broadcastTypingIndicator(selectedConversationId, true);

        // Also update local typing indicator state through context
        setUserTyping(selectedConversationId, true);
      }
    } else if (value.length === 0 && isTyping) {
      // User cleared input
      setIsTyping(false);
      if (selectedConversationId) {
        broadcastTypingIndicator(selectedConversationId, false);

        // Also update local typing indicator state through context
        setUserTyping(selectedConversationId, false);
      }
    }

    // Reset the timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop "is typing" after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && selectedConversationId) {
        setIsTyping(false);
        broadcastTypingIndicator(selectedConversationId, false);

        // Also update local typing indicator state through context
        setUserTyping(selectedConversationId, false);
      }
    }, 2000);
  };

  // Render message status indicator
  const renderMessageStatus = (
    status?: "sending" | "sent" | "delivered" | "error"
  ) => {
    if (!status) return null;

    switch (status) {
      case "sending":
        return <Loader2 className="h-3 w-3 animate-spin ml-1 text-gray-400" />;
      case "sent":
        return <Check className="h-3 w-3 ml-1 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 ml-1 text-blue-500" />;
      case "error":
        return <AlertCircle className="h-3 w-3 ml-1 text-red-500" />;
      default:
        return null;
    }
  };

  // Check if someone in the current conversation is typing
  const someoneIsTyping = useCallback(() => {
    if (!selectedConversationId) return false;

    // Check if there are any active typing users in this conversation
    const conversationTypers = typingStates[selectedConversationId] || [];

    // Filter out the current user's typing status
    const otherUserTyping = conversationTypers.some(
      (typer: any) => typer.userId !== user?.id && typer.isTyping
    );

    return otherUserTyping;
  }, [selectedConversationId, typingStates, user?.id]);

  // Get the name of the person typing
  const getTypingDisplayName = useCallback(() => {
    if (!selectedConversationId || !currentConversation) return "";

    // Get typing users for the conversation (excluding the current user)
    const typingUsers = (typingStates[selectedConversationId] || []).filter(
      (typer: any) => typer.userId !== user?.id
    );

    // Get the first typing user's name
    const typingUser = typingUsers[0];
    if (typingUser?.displayName) {
      return typingUser.displayName;
    }

    // Fallback to conversation participant name if available
    return currentConversation.participant?.display_name || "Someone";
  }, [selectedConversationId, currentConversation, typingStates, user?.id]);

  // Format timestamp for messages
  const formatMessageTime = (timestamp: string | undefined): string => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return ""; // Invalid date

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // If message is from today, show only time
    if (date >= today) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // If message is from yesterday, show "Yesterday"
    if (date >= yesterday) {
      return "Yesterday";
    }

    // If message is from this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    // Otherwise show month, day and year
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Add a helper function to format the last message preview
  const formatMessagePreview = (
    message:
      | {
          content?: string;
          id?: string;
          created_at?: string;
          sender_id?: string;
        }
      | string
      | undefined
  ): string => {
    if (!message) return "Start a conversation...";

    if (typeof message === "string") {
      // Remove "Session Request:" prefix if present
      let content = message.replace(/^Session Request:.*?(?:\n|$)/, "").trim();
      // If content became empty, use a generic message
      if (!content) content = "Tutoring session request";
      return content.length > 30 ? `${content.substring(0, 30)}...` : content;
    }

    if (message.content) {
      // Remove "Session Request:" prefix if present
      let content = message.content
        .replace(/^Session Request:.*?(?:\n|$)/, "")
        .trim();
      // If content became empty, use a generic message
      if (!content) content = "Tutoring session request";
      return content.length > 30 ? `${content.substring(0, 30)}...` : content;
    }

    return "Start a conversation...";
  };

  // Effect that loads messages for unread count calculation - causing potential duplicates
  useEffect(() => {
    if (conversations.length > 0 && user) {
      conversations.forEach((convo: any) => {
        // Skip if this is the currently selected conversation - it's already handled by the other useEffect
        if (convo.id === selectedConversationId) {
          return;
        }

        // Skip if we're already fetching this conversation
        if (fetchInProgressRef.current[convo.id]) {
          return;
        }

        // Skip if we already have messages for this conversation
        if (messages[convo.id] && messages[convo.id].length > 0) {
          return;
        }

        // Check if this conversation might have unread messages
        const hasUnreadCountFlag = convo.unreadCount > 0;

        // Also check if we need to verify unread status based on last_viewed_at
        const currentUserParticipant = convo.participants?.find(
          (p: any) => p.user_id === user.id
        );
        const lastViewedAt = currentUserParticipant?.last_viewed_at;
        const mightHaveUnread =
          convo.last_message &&
          (!lastViewedAt ||
            (new Date(convo.last_message.created_at).getTime() >
              new Date(lastViewedAt).getTime() &&
              convo.last_message.sender_id !== user.id));

        // Only load messages if truly necessary
        if (hasUnreadCountFlag || mightHaveUnread) {
          // Mark this conversation as being fetched
          fetchInProgressRef.current[convo.id] = true;

          // Fetch messages with a try/catch block instead of chaining .finally()
          try {
            refreshMessages(convo.id);
          } catch (error) {}

          // Set a timeout to clear the in-progress flag
          setTimeout(() => {
            fetchInProgressRef.current[convo.id] = false;
          }, 2000);
        }
      });
    }
  }, [conversations, user, messages, refreshMessages, selectedConversationId]);

  // Add a stable reference for messages to prevent flickering
  const messagesRef = useRef<{ [conversationId: string]: any[] }>({});

  // Update the ref when messages change
  useEffect(() => {
    // Only update if we have actual messages
    if (messages && Object.keys(messages).length > 0) {
      // Create a new object to avoid reference issues
      const updatedMessages = { ...messagesRef.current };

      // Copy each conversation's messages
      Object.keys(messages).forEach((convId) => {
        if (messages[convId]?.length > 0) {
          updatedMessages[convId] = [...messages[convId]];
        }
      });

      messagesRef.current = updatedMessages;
    }
  }, [messages]);

  // Get the most stable version of messages - either current state or ref
  const getStableMessages = useCallback(
    (conversationId: string) => {
      if (messages[conversationId]?.length > 0) {
        return messages[conversationId];
      }
      return messagesRef.current[conversationId] || [];
    },
    [messages]
  );

  // Effect to load conversations and messages
  useEffect(() => {
    // Only load if no conversations are available yet
    if (stableConversations.length === 0 && !loading) {
      // Can't call refreshMessages without a conversation ID, so we should handle this differently
      // Rely on the existing page logic to load conversations
      return;
    } else if (
      selectedConversationId &&
      !getStableMessages(selectedConversationId).length &&
      !loadingMessages
    ) {
      // If we have a selected conversation but no messages, prioritize loading those messages
      refreshMessages(selectedConversationId);
    }

    // Auto-scroll to bottom when messages load
    if (
      selectedConversationId &&
      getStableMessages(selectedConversationId).length > 0
    ) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [
    selectedConversationId,
    stableConversations.length,
    loading,
    loadingMessages,
    refreshMessages,
    getStableMessages,
  ]);

  // Format full date for date headers
  const formatFullDate = (date: Date): string => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, now)) {
      return "Today";
    } else if (isSameDay(date, yesterday)) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Helper to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Mark selected conversation as read when it comes into view
  useEffect(() => {
    if (selectedConversationId && scrollAreaRef.current) {
      // Mark the conversation as read
      markConversationAsRead(selectedConversationId);
    }
  }, [selectedConversationId, markConversationAsRead]);

  // Add listener for route change events
  useEffect(() => {
    const handleRouteChange = () => {
      // Mark conversation as read when navigating to the messages page with a conversation ID
      if (selectedConversationId) {
        markConversationAsRead(selectedConversationId);
      }

      // If the user scrolled down before, restore scroll position
      setTimeout(() => {
        if (scrollAreaRef.current) {
          // Scroll to the bottom of the message container
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
          shouldAutoScrollRef.current = true;
        }
      }, 100);
    };

    // Listen for popstate events
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [selectedConversationId, markConversationAsRead]);

  // Effect that monitors scroll position for scrolled state
  useEffect(() => {
    // Only run this effect if we're on a desktop device
    if (
      typeof window !== "undefined" &&
      window.innerWidth >= 640 &&
      scrollAreaRef.current
    ) {
      const checkScrollPosition = () => {
        if (scrollAreaRef.current) {
          const { scrollTop, scrollHeight, clientHeight } =
            scrollAreaRef.current;
          const isScrolled = scrollTop < scrollHeight - clientHeight - 10;
          shouldAutoScrollRef.current = !isScrolled;
        }
      };

      const scrollContainer = scrollAreaRef.current;
      scrollContainer.addEventListener("scroll", checkScrollPosition);

      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener("scroll", checkScrollPosition);
        }
      };
    }
  }, [selectedConversationId, messages]);

  // Auto-scroll when new messages appear, if user was scrolled to bottom
  useEffect(() => {
    if (
      shouldAutoScrollRef.current &&
      selectedConversationId &&
      messages[selectedConversationId]?.length > 0
    ) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, selectedConversationId]);

  // Auto-scroll when new sessions appear, if user was scrolled to bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current && sessionItems.length > 0) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [sessionItems]);

  // Automatically load messages when conversation changes, but with strict controls to prevent duplicate fetches
  useEffect(() => {
    if (!selectedConversationId) return;

    // Use a ref to track if the component is still mounted when the fetch completes
    const isMounted = { current: true };

    const loadMessagesAndSessions = async () => {
      try {
        // Check if this is a temporary conversation
        const isTemp = isTempConversation(selectedConversationId);
        if (isTemp) {
          // Don't return early, we still want to mark this conversation as loaded
          // And we want to make sure we have an empty array initialized for this conversation
          if (!messages[selectedConversationId]) {
            // Initialize an empty array for this temporary conversation if it doesn't exist yet
            if (isMounted.current) {
              loadedConversationsRef.current.add(selectedConversationId);
            }
          }
          return;
        }

        // Mark fetch as in progress to block any parallel requests
        if (fetchInProgressRef.current[selectedConversationId]) {
          return;
        }

        fetchInProgressRef.current[selectedConversationId] = true;

        try {
          // Load the messages
          await refreshMessages(selectedConversationId);

          // Also fetch sessions for this conversation
          const sessionsResponse = await fetch(
            `/api/tutoring-sessions?conversation_id=${selectedConversationId}`,
            {
              method: "GET",
              credentials: "include",
              headers: { "Cache-Control": "no-cache" },
            }
          );

          if (sessionsResponse.ok && isMounted.current) {
            const sessionsData = await sessionsResponse.json();
            const sessionsForConversation = sessionsData.sessions || [];

            // Sort sessions by created_at to ensure chronological ordering
            const sortedSessions = [...sessionsForConversation].sort((a, b) => {
              // Always use created_at for sorting, as it's guaranteed to exist
              return (
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
              );
            });

            // Map sessions to a format compatible with message display
            const newSessionItems = sortedSessions.map((session) => ({
              id: `session-${session.id}`,
              type: "session" as const,
              display_order: session.created_at || new Date().toISOString(),
              session,
            })) as SessionItem[];

            if (isMounted.current) {
              setSessionItems(newSessionItems);
            }
          }

          // Mark this conversation as loaded
          if (isMounted.current) {
            loadedConversationsRef.current.add(selectedConversationId);

            // Mark as read after loading messages - this is a selected conversation
            if (isMounted.current) {
              markConversationAsRead(selectedConversationId);
            }
          }
        } catch (error) {}
      } catch (error) {
      } finally {
        // Clear the in-progress flag after a delay to prevent rapid refetching
        setTimeout(() => {
          if (isMounted.current) {
            fetchInProgressRef.current[selectedConversationId] = false;
          }
        }, 2000); // 2-second cooldown
      }
    };

    loadMessagesAndSessions();

    // Cleanup function
    return () => {
      // Mark component as unmounted to prevent state updates after unmount
      isMounted.current = false;
    };
  }, [
    selectedConversationId,
    refreshMessages,
    markConversationAsRead,
    getStableMessages,
    isTempConversation,
    messages,
  ]);

  // Check if current conversation is temporary
  const isCurrentConversationTemp = selectedConversationId
    ? isTempConversation(selectedConversationId)
    : false;

  // Define custom styles for the active conversation with proper TypeScript types
  const activeConversationStyle: React.CSSProperties = {
    position: "relative",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  };

  const activeConversationBeforeStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "4px",
    backgroundColor: "#3b82f6", // Blue-500 color
  };

  // Add these new states for profile dialog
  const [showProfileDialog, setShowProfileDialog] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<StudentProfileData | null>(
    null
  );
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Add function to fetch student profile
  const fetchStudentProfile = async (studentId: string) => {
    if (!studentId || user?.role !== "tutor") return;

    try {
      setLoadingProfile(true);

      // Use a direct API route that specifically fetches student profile data
      // Fetch the complete profile with all fields
      const response = await fetch(
        `/api/users/profile/${studentId}?profile_type=student&complete=true`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch student profile: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched student profile data:", data.profile);

      // The profile data is returned directly from the student_profile table
      setProfileData(data.profile);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load student profile",
        variant: "destructive",
      });
      console.error("Error fetching student profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handler for opening the profile dialog
  const handleOpenProfileDialog = (studentId: string) => {
    if (!studentId || user?.role !== "tutor") return;

    fetchStudentProfile(studentId);
    setShowProfileDialog(true);
  };

  // Create a combined items array with messages and sessions
  const combinedItems = useMemo(() => {
    if (!selectedConversationId || !messages[selectedConversationId]) {
      return [];
    }

    // Get messages for the current conversation
    const currentMessages = getStableMessages(selectedConversationId);

    // Create message-like objects from messages
    const messageItems = currentMessages.map((msg) => ({
      id: msg.id,
      type: "message" as const,
      display_order: msg.created_at || "",
      message: msg,
    }));

    // Combine message items with session items
    const combined = [...messageItems, ...sessionItems];

    // Sort by timestamp/created_at
    return combined.sort((a, b) => {
      // For messages, use created_at timestamp
      // For sessions, use created_at which is specifically for chronological sorting
      const timeA =
        a.type === "message"
          ? new Date(a.message.created_at || "").getTime()
          : new Date(a.session.created_at).getTime();

      const timeB =
        b.type === "message"
          ? new Date(b.message.created_at || "").getTime()
          : new Date(b.session.created_at).getTime();

      return timeA - timeB;
    });
  }, [selectedConversationId, messages, sessionItems, getStableMessages]);

  // Add CSS for hiding scrollbars
  useEffect(() => {
    // Add a style tag to hide scrollbars on elements with the scrollbar-hide class
    const style = document.createElement("style");
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      
      /* Improve touch interactions on mobile */
      @media (max-width: 640px) {
        .touch-improved {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Auto-scroll when combinedItems change (either messages or sessions), if user was scrolled to bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current && combinedItems.length > 0) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [combinedItems]);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full relative">
      <div className="absolute inset-0 from-primary/5 via-background to-muted/10 pointer-events-none"></div>

      {/* Mobile-only back button - fixed position */}
      {selectedConversationId && (
        <div className="fixed bottom-4 left-4 z-50 md:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSelectedConversationId("");
              router.replace("/dashboard/messages", { scroll: false });
            }}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-lg touch-manipulation"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div className="flex h-full max-h-[calc(100vh-4rem)] relative z-10 rounded-2xl sm:border border-border/30 bg-gradient-to-b overflow-hidden shadow-md">
        {/* Left sidebar - dashboard navigation has been removed */}

        {/* Middle column - conversations list */}
        <div
          className={`w-full md:w-1/3 sm:border-r border-border/40 flex flex-col ${
            selectedConversationId ? "hidden md:flex" : "flex"
          } sm:rounded-l-2xl overflow-hidden`}
        >
          <div className="p-3 sm:p-4 border-b border-border/40 flex items-center gap-2 bg-card/40 backdrop-blur-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 bg-background/60 backdrop-blur-sm border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-lg"
              />
            </div>
          </div>

          <div className="flex-grow overflow-auto ">
            {loading && isInitialLoad && stableConversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare
                    className="h-8 w-8 text-primary/80"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  No conversations yet
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-6 max-w-[240px]">
                  {user?.role === "tutor"
                    ? "When you message a student, your conversations will appear here"
                    : "When you message a tutor, your conversations will appear here"}
                </p>
                {user?.role !== "tutor" && (
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary hover:bg-primary/90 shadow-sm"
                  >
                    <Link href="/tutors">Find a Tutor</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredConversations.map((convo: any) => (
                  <div
                    key={convo.id}
                    style={
                      selectedConversationId === convo.id
                        ? activeConversationStyle
                        : undefined
                    }
                    className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-all touch-improved"
                    onClick={() => {
                      // Only mark as read and set selected conversation if it changes
                      if (selectedConversationId !== convo.id) {
                        // Set selected conversation ID first
                        setSelectedConversationId(convo.id);

                        // Update URL without full page refresh to prevent reloading all conversations
                        // Use router.replace instead of window.history.replaceState for more reliable navigation
                        router.replace(
                          `/dashboard/messages?conversationId=${convo.id}`,
                          { scroll: false }
                        );

                        // Check if this is a temporary conversation before trying to mark as read
                        if (
                          !isTempConversation(convo.id) &&
                          hasUnreadMessages(convo.id)
                        ) {
                          markConversationAsRead(convo.id)
                            .then((success: any) => {
                              if (!success) {
                              }
                            })
                            .catch((err: any) => {});
                        }
                      }
                    }}
                  >
                    {selectedConversationId === convo.id && (
                      <div style={activeConversationBeforeStyle}></div>
                    )}
                    <div className="flex items-start space-x-2 sm:space-x-4">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border border-border/40 shadow-sm">
                        <AvatarImage
                          src={convo.participant?.avatar_url || undefined}
                          alt={convo.participant?.display_name || "User"}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {convo.participant?.display_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-medium truncate flex items-center">
                            {convo.participant?.display_name || "Unknown user"}
                            {convo.participant?.is_tutor && (
                              <Badge
                                variant="outline"
                                className="ml-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/20 text-[10px] font-normal hidden sm:inline-flex"
                              >
                                Tutor
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                            {formatMessageTime(
                              convo.last_message_at ||
                                convo.last_message?.created_at
                            )}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[160px]">
                            {formatMessagePreview(convo.last_message)}
                          </p>
                          {isUserTyping(convo.id) ? (
                            <span className="text-xs text-primary flex items-center gap-1">
                              <span className="flex space-x-1">
                                <span className="h-1 w-1 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-1 w-1 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-1 w-1 bg-primary/70 rounded-full animate-bounce"></span>
                              </span>
                              <span className="hidden sm:inline">Typing</span>
                            </span>
                          ) : (
                            <UnreadBadge
                              conversation={convo}
                              messages={messages[convo.id] || []}
                              userId={user?.id || ""}
                              selectedConversationId={selectedConversationId}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column - chat area */}
        <div
          className={`${
            selectedConversationId ? "flex" : "hidden"
          } sm:flex flex-col flex-1 h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/10 rounded-r-2xl overflow-hidden`}
        >
          {selectedConversationId && currentConversation ? (
            <>
              {/* Chat header */}
              <div className="p-3 sm:p-4 border-b border-border/40 flex items-center justify-between bg-card/40 backdrop-blur-sm shadow-sm sm:rounded-tr-2xl">
                <div
                  className={`flex items-center gap-2 sm:gap-3 ${
                    user?.role === "tutor" &&
                    !currentConversation?.participant?.is_tutor
                      ? "cursor-pointer hover:bg-muted/60 rounded-md px-2 transition-all duration-200"
                      : ""
                  }`}
                  onClick={() => {
                    // Only allow tutors to view student profiles
                    if (
                      user?.role === "tutor" &&
                      !currentConversation?.participant?.is_tutor &&
                      currentConversation?.participant?.id
                    ) {
                      handleOpenProfileDialog(
                        currentConversation.participant.id
                      );
                    }
                  }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent onClick
                      setSelectedConversationId("");
                      // Update URL without the conversationId parameter
                      router.replace("/dashboard/messages", { scroll: false });
                    }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border border-border/40 shadow-sm">
                    <AvatarImage
                      src={
                        currentConversation?.participant?.avatar_url ||
                        undefined
                      }
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {currentConversation?.participant?.display_name?.charAt(
                        0
                      ) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-medium">
                        {currentConversation?.participant?.display_name}
                      </h2>
                      {currentConversation?.participant?.is_tutor && (
                        <Badge
                          variant="outline"
                          className="bg-primary/5 text-primary border-primary/20 text-xs font-normal hidden sm:inline-flex"
                        >
                          Tutor
                        </Badge>
                      )}
                      {/* Show info icon for tutors when looking at student profiles */}
                      {user?.role === "tutor" &&
                        !currentConversation?.participant?.is_tutor && (
                          <div className="flex items-center ml-1 hidden sm:flex">
                            <Info className="h-3.5 w-3.5 text-primary/60 animate-pulse" />
                            <span className="ml-1 text-s text-primary/60">
                              Click to view profile
                            </span>
                          </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isUserTyping(selectedConversationId) ? (
                        <span className="text-primary animate-pulse flex items-center gap-1">
                          <span className="flex space-x-1">
                            <span className="h-1.5 w-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-1.5 w-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-1.5 w-1.5 bg-primary/70 rounded-full animate-bounce"></span>
                          </span>
                          <span>Typing</span>
                        </span>
                      ) : (
                        "Online"
                      )}
                    </p>
                  </div>
                </div>

                {/* Schedule Session button - only shown to tutors */}
                {user?.role === "tutor" && (
                  <Dialog
                    open={showSessionDialog}
                    onOpenChange={setShowSessionDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSessionDialog(true)}
                        className="shadow-sm border-border/40 hover:bg-muted transition-colors text-xs sm:text-sm"
                      >
                        <Calendar
                          className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-primary/80"
                          strokeWidth={1.5}
                        />
                        <span className="hidden xs:inline">Schedule</span>
                        <span className="xs:hidden">Session</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule a Session</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label
                            htmlFor="session-title"
                            className="text-sm font-medium"
                          >
                            Title
                          </label>
                          <Input
                            id="session-title"
                            placeholder="e.g., Spanish Vocabulary Review"
                            value={sessionTitle}
                            onChange={(e) => setSessionTitle(e.target.value)}
                            className="border-border/40"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <label
                              htmlFor="session-date"
                              className="text-sm font-medium"
                            >
                              Date
                            </label>
                            <Input
                              id="session-date"
                              type="date"
                              value={sessionDate}
                              onChange={(e) => setSessionDate(e.target.value)}
                              className="border-border/40"
                            />
                          </div>
                          <div className="grid gap-2">
                            <label
                              htmlFor="session-time"
                              className="text-sm font-medium"
                            >
                              Time
                            </label>
                            <Input
                              id="session-time"
                              type="time"
                              value={sessionTime}
                              onChange={(e) => setSessionTime(e.target.value)}
                              className="border-border/40"
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {`localized to your current time (${
                            Intl.DateTimeFormat().resolvedOptions().timeZone
                          }, GMT${offsetHours >= 0 ? "+" : ""}${offsetHours})`}
                        </span>
                        <div className="grid gap-2">
                          <label
                            htmlFor="session-cost"
                            className="text-sm font-medium"
                          >
                            Cost (Credits)
                          </label>
                          <Input
                            id="session-cost"
                            type="number"
                            min="1"
                            step="1"
                            value={sessionCost}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setSessionCost(
                                isNaN(value) || value < 1 ? 1 : value
                              );
                            }}
                            className="border-border/40"
                          />
                          <p className="text-xs text-muted-foreground">
                            Students will need this many Credits to accept the
                            session
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowSessionDialog(false)}
                          className="border-border/40"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          onClick={handleScheduleSession}
                          disabled={
                            isSchedulingSession ||
                            !sessionTitle ||
                            !sessionDate ||
                            !sessionTime
                          }
                          className="bg-primary hover:bg-primary/90"
                        >
                          {isSchedulingSession && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Schedule
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Temporary conversation alert - Make it more compact and fixed position */}
              {isCurrentConversationTemp && (
                <Alert className="mx-4 mt-4 py-2 flex items-center bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shadow-sm rounded-xl">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <div className="ml-2 flex-grow">
                    <AlertTitle className="text-xs font-medium">
                      Draft conversation
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      Send a message to create this conversation.
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <ScrollArea
                className="flex-1 p-3 sm:p-4 min-h-[calc(100vh-17rem)] h-full scrollbar-hide"
                ref={scrollAreaRef}
                onScroll={handleScroll}
              >
                {loadingMessages &&
                isInitialLoad &&
                (!selectedConversationId ||
                  !getStableMessages(selectedConversationId).length) ? (
                  <div className="flex items-center justify-center h-full flex-grow">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : selectedConversationId ? (
                  // Use getStableMessages to get the most reliable version of the messages
                  getStableMessages(selectedConversationId).length === 0 ? (
                    <div className="flex items-center justify-center h-full flex-grow">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-5 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 shadow-sm">
                          <MessageSquare
                            className="h-10 w-10 text-primary/80"
                            strokeWidth={1.5}
                          />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          Start a conversation!
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                          Send a message below to begin chatting with{" "}
                          {currentConversation?.participant?.display_name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 min-h-full flex flex-col">
                      {combinedItems.map((item) => {
                        // Always use a stable key based on ID to maintain component identity
                        const uniqueItemKey =
                          item.type === "message"
                            ? `message-fragment-${item.message.id}`
                            : `session-fragment-${item.session.id}`;

                        // Get date info for this item
                        const currentDate =
                          item.type === "message"
                            ? item.message.created_at
                              ? new Date(item.message.created_at)
                              : new Date()
                            : item.session.created_at
                            ? new Date(item.session.created_at)
                            : new Date();

                        // Find previous item for date comparison
                        const currentItemIndex = combinedItems.findIndex(
                          (i) => i.id === item.id
                        );
                        const prevItem =
                          currentItemIndex > 0
                            ? combinedItems[currentItemIndex - 1]
                            : null;
                        const prevDate = prevItem
                          ? prevItem.type === "message"
                            ? prevItem.message.created_at
                              ? new Date(prevItem.message.created_at)
                              : null
                            : prevItem.session.created_at
                            ? new Date(prevItem.session.created_at)
                            : null
                          : null;

                        // Only show date header when the date changes
                        const showDateHeader =
                          !prevDate || !isSameDay(currentDate, prevDate);

                        if (item.type === "message") {
                          // Render message (existing message rendering code)
                          const message = item.message;
                          const isFromMe = message.sender_id === user.id;

                          // Detect credit request messages and render CreditRequestCard
                          const isCreditRequestMessage =
                            message.content &&
                            message.content.trim().startsWith("Credit Request:");

                          if (isCreditRequestMessage) {
                            // Parse title and amount from message content
                            const titleMatch = message.content?.match(/Credit Request:\s*(.+?)(?:\n|$)/);
                            const creditMatch = message.content?.match(/Credits:\s*(\d+)/i);
                            
                            const requestTitle = titleMatch?.[1]?.trim() || "Credit Request";
                            const requestAmount = creditMatch ? parseInt(creditMatch[1], 10) : 0;

                            return (
                              <div key={`credit-request-${message.id}`}>
                                {showDateHeader && (
                                  <div className="flex justify-center my-3 sm:my-4">
                                    <div className="bg-muted/70 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs text-muted-foreground shadow-sm border border-border/20">
                                      {formatFullDate(currentDate)}
                                    </div>
                                  </div>
                                )}
                                <div className="w-full flex flex-col p-2">
                                  <CreditRequestCard
                                    messageId={message.id}
                                    conversationId={selectedConversationId || message.conversation_id || ""}
                                    tutorId={message.sender_id}
                                    title={requestTitle}
                                    amount={requestAmount}
                                  />
                                </div>
                              </div>
                            );
                          }

                          // Store a reference to the message element
                          const setMessageRef = (el: HTMLDivElement | null) => {
                            if (el) {
                              messageElementRefs.current[message.id] = el;
                            }
                          };

                          return (
                            <div key={uniqueItemKey} ref={setMessageRef}>
                              {/* Date header shown when date changes */}
                              {showDateHeader && (
                                <div className="flex justify-center my-3 sm:my-4">
                                  <div className="bg-muted/70 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs text-muted-foreground shadow-sm border border-border/20">
                                    {formatFullDate(currentDate)}
                                  </div>
                                </div>
                              )}

                              {/* Message */}
                              <div
                                className={`flex ${
                                  isFromMe ? "justify-end" : "justify-start"
                                } mb-4`}
                              >
                                <div className="flex items-end gap-2 max-w-[85%]">
                                  {!isFromMe && (
                                    <Avatar className="h-7 w-7 border border-border/40 shadow-sm">
                                      <AvatarImage
                                        src={
                                          message.sender?.avatar_url ||
                                          undefined
                                        }
                                        alt={
                                          message.sender?.display_name || "User"
                                        }
                                      />
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {message.sender?.display_name?.charAt(
                                          0
                                        ) || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div>
                                    <div
                                      className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm rounded-2xl ${
                                        isFromMe
                                          ? "bg-primary text-primary-foreground shadow-sm hover:shadow-md transition-shadow"
                                          : "bg-card dark:bg-card/80 border border-border/40 shadow-sm hover:shadow-md hover:bg-card/90 dark:hover:bg-card/90 transition-all"
                                      }`}
                                    >
                                      <div className="flex flex-col gap-2">
                                        {message.content && (
                                          <div className="whitespace-pre-wrap break-words max-w-full" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                                            {message.content}
                                          </div>
                                        )}

                                        {message.attachments?.length > 0 && (
                                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {message.attachments.map(
                                              (att: any, i: number) => {
                                                const isImage =
                                                  att?.mime?.startsWith?.(
                                                    "image/"
                                                  );
                                                const url =
                                                  att?.url || att?.path || "";
                                                return (
                                                  <div
                                                    key={i}
                                                    className="flex items-center gap-2 p-2 bg-background/50 rounded"
                                                  >
                                                    {isImage ? (
                                                      <img
                                                        src={url}
                                                        alt={att?.name}
                                                        className="h-24 w-24 object-cover rounded"
                                                      />
                                                    ) : (
                                                      <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 text-sm text-primary underline"
                                                      >
                                                        <svg
                                                          xmlns="http://www.w3.org/2000/svg"
                                                          className="h-5 w-5"
                                                          viewBox="0 0 20 20"
                                                          fill="currentColor"
                                                        >
                                                          <path
                                                            fillRule="evenodd"
                                                            d="M8 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V7.414A2 2 0 0014.414 6L11 2.586A2 2 0 009.586 2H8zM11 3.414L13.586 6H11V3.414z"
                                                            clipRule="evenodd"
                                                          />
                                                        </svg>
                                                        <span className="truncate max-w-[160px]">
                                                          {att?.name}
                                                        </span>
                                                      </a>
                                                    )}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      className={`flex items-center text-xs text-muted-foreground mt-1 ${
                                        isFromMe
                                          ? "justify-end pr-1"
                                          : "justify-start pl-1"
                                      }`}
                                    >
                                      {formatMessageTime(message.created_at)}
                                      {isFromMe && (
                                        <span className="ml-1">
                                          {renderMessageStatus(message.status)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Render a session
                          const session = item.session;
                          return (
                            <div key={uniqueItemKey}>
                              {showDateHeader && (
                                <div className="flex justify-center my-3 sm:my-4">
                                  <div className="bg-muted/70 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs text-muted-foreground shadow-sm border border-border/20">
                                    {formatFullDate(currentDate)}
                                  </div>
                                </div>
                              )}
                              <div className="w-full flex flex-col p-2">
                                <SessionRequestCard
                                  messageId="" // Empty string since there's no message associated directly
                                  sessionId={session.id}
                                  conversationId={
                                    session.conversation_id ||
                                    selectedConversationId ||
                                    ""
                                  }
                                  title={session.name || "Tutoring Session"}
                                  scheduledFor={
                                    session.scheduled_for ||
                                    new Date().toISOString()
                                  }
                                  status={
                                    (session.status as any) || "requested"
                                  }
                                  tutorReady={session.tutor_ready || false}
                                  studentReady={session.student_ready || false}
                                  cost={session.cost || undefined}
                                />
                              </div>
                            </div>
                          );
                        }
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto mb-4 sm:mb-5 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 shadow-sm">
                        <MessageSquare
                          className="h-8 sm:h-10 w-8 sm:w-10 text-primary/80"
                          strokeWidth={1.5}
                        />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">
                        Your Messages
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4 sm:mb-6 px-4 sm:px-0">
                        Select a conversation from the sidebar to view your
                        messages
                      </p>
                      {user?.role !== "tutor" && (
                        <Button
                          asChild
                          size="sm"
                          className="bg-primary hover:bg-primary/90 shadow-sm"
                        >
                          <Link href="/tutors">Find a Tutor</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Message input */}
              <div className="p-2 sm:p-3 border-t border-border/40 bg-card/40 backdrop-blur-sm rounded-br-2xl">
                <div className="flex items-center gap-3 pl-1">
                  {/* Attach button + hidden file input */}
                  <div className="flex items-center">
                    <input
                      ref={fileInputRef}
                      id="message-attachments"
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files) return;
                        const arr = Array.from(files || []);
                        setPendingAttachments((prev) => [...prev, ...arr]);
                        // reset input so same file can be added again if needed
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-md flex items-center justify-center"
                      title="Attach files"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-5 w-5 text-muted-foreground"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3 3 0 014.24 4.24L9.88 17.66a1 1 0 01-1.42-1.42l8.9-8.9"
                        />
                      </svg>
                    </Button>
                    {/* Tutors: quick credit request dialog trigger */}
                    {user?.role === "tutor" && (
                      <div className="ml-2">
                        <Dialog
                          open={showCreditDialog}
                          onOpenChange={setShowCreditDialog}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9">
                              Request
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Request Credits</DialogTitle>
                              <DialogDescription>
                                Request credits from the student via message.
                                This will send a session request message without
                                creating a call.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                  Title
                                </label>
                                <Input
                                  value={creditTitle}
                                  onChange={(e) =>
                                    setCreditTitle(e.target.value)
                                  }
                                  placeholder="e.g., 1-hour tutoring"
                                />
                              </div>
                              <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                  Credits
                                </label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={creditAmount || ""}
                                  onChange={(e) =>
                                    setCreditAmount(
                                      parseInt(e.target.value || "0") || 0
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setShowCreditDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="bg-primary"
                                onClick={async () => {
                                  // Validate
                                  if (!creditTitle || creditAmount <= 0) {
                                    toast({
                                      variant: "destructive",
                                      title: "Invalid request",
                                      description:
                                        "Please enter a title and a positive credit amount.",
                                    });
                                    return;
                                  }
                                  try {
                                    const content = `Credit Request: ${creditTitle}\nCredits: ${creditAmount}`;
                                    await sendMessage(
                                      selectedConversationId || "",
                                      content
                                    );
                                    toast({
                                      title: "Request sent",
                                      description:
                                        "Credit request message sent.",
                                    });
                                    setCreditTitle("");
                                    setCreditAmount(0);
                                    setShowCreditDialog(false);
                                  } catch (err: any) {
                                    toast({
                                      variant: "destructive",
                                      title: "Failed",
                                      description:
                                        err?.message ||
                                        "Failed to send request",
                                    });
                                  }
                                }}
                              >
                                Send Request
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <Textarea
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => {
                        // support both input and textarea change shapes
                        const value = (e.target as HTMLTextAreaElement).value;
                        setMessageText(value);

                        // typing indicator logic
                        if (!isTyping && value.length > 0) {
                          setIsTyping(true);
                          if (selectedConversationId) {
                            broadcastTypingIndicator(
                              selectedConversationId,
                              true
                            );
                            setUserTyping(selectedConversationId, true);
                          }
                        } else if (value.length === 0 && isTyping) {
                          setIsTyping(false);
                          if (selectedConversationId) {
                            broadcastTypingIndicator(
                              selectedConversationId,
                              false
                            );
                            setUserTyping(selectedConversationId, false);
                          }
                        }

                        if (typingTimeoutRef.current) {
                          clearTimeout(
                            typingTimeoutRef.current as NodeJS.Timeout
                          );
                        }
                        typingTimeoutRef.current = setTimeout(() => {
                          if (isTyping && selectedConversationId) {
                            setIsTyping(false);
                            broadcastTypingIndicator(
                              selectedConversationId,
                              false
                            );
                            setUserTyping(selectedConversationId, false);
                          }
                        }, 2000);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[44px] border-border/40 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/20 bg-background/80 backdrop-blur-sm transition-all rounded-sm py-2 px-3 touch-improved"
                    />

                    {/* Preview pending attachments count */}
                    {pendingAttachments.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <div className="mb-1">
                          {pendingAttachments.length} attachment
                          {pendingAttachments.length > 1 ? "s" : ""} selected
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {pendingAttachments.map((f, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-background/60 px-2 py-1 rounded text-xs"
                            >
                              <span className="truncate max-w-[160px]">
                                {f.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingAttachments((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                                className="text-muted-foreground hover:text-destructive ml-1"
                                aria-label={`Remove ${f.name}`}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      isUploadingAttachments ||
                      pendingAttachments.length > 0 ||
                      !messageText.trim() ||
                      (isCurrentConversationTemp &&
                        messageText.trim().length < 2)
                    }
                    className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all rounded-md h-10 w-10 touch-manipulation flex items-center justify-center"
                    size="icon"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                  {isUploadingAttachments && (
                    <div className="text-xs text-muted-foreground ml-2">
                      Uploading...
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-5 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 shadow-sm">
                  <MessageSquare
                    className="h-10 w-10 text-primary/80"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Your Messages</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                  Select a conversation from the sidebar to view your messages
                </p>
                {user?.role !== "tutor" && (
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary hover:bg-primary/90 shadow-sm"
                  >
                    <Link href="/tutors">Find a Tutor</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
            <DialogDescription>
              Detailed information about this student
            </DialogDescription>
          </DialogHeader>

          {loadingProfile && !profileData ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Fetching student information...
              </p>
            </div>
          ) : profileData ? (
            <div className="space-y-6 py-2">
              {/* Basic Information Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border/40 shadow-md">
                  <AvatarImage src={profileData.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {profileData.first_name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">
                    {profileData.first_name} {profileData.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">Student</p>
                  {profileData.age && (
                    <p className="text-sm text-muted-foreground">
                      Age: {profileData.age}
                    </p>
                  )}
                </div>
              </div>

              {/* Educational Background */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Educational Background
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-3">
                  {/* Year/Form */}
                  {profileData.year && (
                    <div>
                      <h4 className="text-sm font-medium">Year/Form</h4>
                      <p className="text-sm">{profileData.year}</p>
                    </div>
                  )}

                  {/* Current School */}
                  {profileData.school_name && (
                    <div>
                      <h4 className="text-sm font-medium">Current School</h4>
                      <p className="text-sm">{profileData.school_name}</p>
                    </div>
                  )}

                  {/* Previous Schools */}
                  {profileData.previous_schools && (
                    <div>
                      <h4 className="text-sm font-medium">Previous Schools</h4>
                      {Array.isArray(profileData.previous_schools) ? (
                        <p className="text-sm">
                          {profileData.previous_schools.join(", ")}
                        </p>
                      ) : typeof profileData.previous_schools === "string" ? (
                        <p className="text-sm">
                          {profileData.previous_schools}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Current Subjects */}
                  <div>
                    <h4 className="text-sm font-medium">Current Subjects</h4>
                    <p className="text-sm">
                      {(() => {
                        // Handle array format
                        if (
                          Array.isArray(profileData.current_subjects) &&
                          profileData.current_subjects.length > 0
                        ) {
                          return profileData.current_subjects.join(", ");
                        }
                        // Handle string format (comma-separated)
                        else if (
                          typeof profileData.current_subjects === "string" &&
                          profileData.current_subjects
                        ) {
                          return profileData.current_subjects;
                        }
                        // Default case - no subjects
                        else {
                          return (
                            <span className="text-muted-foreground">
                              Not specified
                            </span>
                          );
                        }
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bio/About Section */}
              {profileData.bio && (
                <Card className="border border-border/40 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {profileData.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* University Plans Section */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">University Plans</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-3">
                  {/* Application Cycle */}
                  {profileData.application_cycle && (
                    <div>
                      <h4 className="text-sm font-medium">Application Cycle</h4>
                      <p className="text-sm">{profileData.application_cycle}</p>
                    </div>
                  )}

                  {/* Intended Universities */}
                  <div>
                    <h4 className="text-sm font-medium">
                      Intended Universities
                    </h4>
                    <p className="text-sm">
                      {profileData.intended_universities || (
                        <span className="text-muted-foreground">
                          Not specified
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Countries to Apply */}
                  {profileData.countries_to_apply && (
                    <div>
                      <h4 className="text-sm font-medium">
                        Countries Planning to Apply To
                      </h4>
                      <p className="text-sm">
                        {profileData.countries_to_apply}
                      </p>
                    </div>
                  )}

                  {/* Universities to Apply */}
                  {profileData.universities_to_apply && (
                    <div>
                      <h4 className="text-sm font-medium">
                        Universities Planning to Apply To
                      </h4>
                      <p className="text-sm">
                        {profileData.universities_to_apply}
                      </p>
                    </div>
                  )}

                  {/* Intended Major */}
                  <div>
                    <h4 className="text-sm font-medium">Intended Major</h4>
                    <p className="text-sm">
                      {profileData.intended_major || (
                        <span className="text-muted-foreground">
                          Not specified
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Planned Admissions Tests */}
                  {profileData.planned_admissions_tests && (
                    <div>
                      <h4 className="text-sm font-medium">
                        Planned Admissions Tests
                      </h4>
                      <p className="text-sm">
                        {profileData.planned_admissions_tests}
                      </p>
                    </div>
                  )}

                  {/* Completed Admissions Tests */}
                  {profileData.completed_admissions_tests && (
                    <div>
                      <h4 className="text-sm font-medium">
                        Completed Admissions Tests
                      </h4>
                      <p className="text-sm">
                        {profileData.completed_admissions_tests}
                      </p>
                    </div>
                  )}

                  {/* Planned Admissions Support */}
                  {profileData.planned_admissions_support && (
                    <div>
                      <h4 className="text-sm font-medium">
                        Planned Admissions Support
                      </h4>
                      <p className="text-sm">
                        {profileData.planned_admissions_support}
                      </p>
                    </div>
                  )}

                  {/* Other University Information */}
                  {profileData.university_other_info && (
                    <div>
                      <h4 className="text-sm font-medium">
                        Other University Information
                      </h4>
                      <p className="text-sm">
                        {profileData.university_other_info}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Examination Records */}
              {((profileData.a_levels && profileData.a_levels.length > 0) ||
                (profileData.ib_diploma && profileData.ib_diploma.length > 0) ||
                (profileData.igcse && profileData.igcse.length > 0) ||
                (profileData.spm && profileData.spm.length > 0)) && (
                <Card className="border border-border/40 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Examination Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-4">
                    {/* A-Levels */}
                    {profileData.a_levels &&
                      profileData.a_levels.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">A-Levels</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>AS Grade</TableHead>
                                <TableHead>Predicted Grade</TableHead>
                                <TableHead>Achieved Grade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {profileData.a_levels?.map((entry, index) => (
                                <TableRow key={index}>
                                  <TableCell>{entry.subject}</TableCell>
                                  <TableCell>{entry.asGrade || "-"}</TableCell>
                                  <TableCell>
                                    {entry.predictedGrade || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {entry.achievedGrade || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                    {/* IB Diploma */}
                    {profileData.ib_diploma &&
                      profileData.ib_diploma.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            IB Diploma
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Predicted Grade</TableHead>
                                <TableHead>Achieved Grade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {profileData.ib_diploma?.map((entry, index) => (
                                <TableRow key={index}>
                                  <TableCell>{entry.subject}</TableCell>
                                  <TableCell>
                                    {entry.predictedGrade || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {entry.achievedGrade || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                    {/* IGCSE */}
                    {profileData.igcse && profileData.igcse.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">IGCSE</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead>Achieved Grade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profileData.igcse?.map((entry, index) => (
                              <TableRow key={index}>
                                <TableCell>{entry.subject}</TableCell>
                                <TableCell>
                                  {entry.achievedGrade || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* SPM */}
                    {profileData.spm && profileData.spm.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">SPM</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead>Achieved Grade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profileData.spm?.map((entry, index) => (
                              <TableRow key={index}>
                                <TableCell>{entry.subject}</TableCell>
                                <TableCell>
                                  {entry.achievedGrade || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Extracurricular Activities and Awards */}
              {((profileData.extracurricular_activities &&
                profileData.extracurricular_activities.length > 0) ||
                (profileData.awards && profileData.awards.length > 0)) && (
                <Card className="border border-border/40 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Activities & Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-4">
                    {/* Extracurricular Activities */}
                    {profileData.extracurricular_activities &&
                      profileData.extracurricular_activities.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Extracurricular Activities
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Activity</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Year(s)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {profileData.extracurricular_activities?.map(
                                (entry, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{entry.activity}</TableCell>
                                    <TableCell>
                                      {entry.description || "-"}
                                    </TableCell>
                                    <TableCell>
                                      {entry.yearParticipated || "-"}
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                    {/* Awards */}
                    {profileData.awards && profileData.awards.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Honors & Awards
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Award</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Year</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profileData.awards?.map((entry, index) => (
                              <TableRow key={index}>
                                <TableCell>{entry.name}</TableCell>
                                <TableCell>
                                  {entry.description || "-"}
                                </TableCell>
                                <TableCell>
                                  {entry.yearAwarded || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-muted-foreground">
                Could not load student profile
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProfileDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
