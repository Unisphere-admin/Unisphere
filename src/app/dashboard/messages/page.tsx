"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useTransition } from "react";
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";
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
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SessionRequestCard, parseSessionRequest } from "@/components/SessionRequestCard";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  // For UI tracking
  isSessionRequest?: boolean;
  pendingSessionCreation?: boolean;
}

// Define interface for session objects
interface ActiveSession {
  id: string;
  message_id: string;
  name?: string | null;
  scheduled_for?: string | null;
  status?: string;
  tutor_ready?: boolean;
  student_ready?: boolean;
  tutor_id?: string;
  student_id?: string;
  conversation_id?: string;
  cost?: number | null;
}

// Create a standalone UnreadBadge component
const UnreadBadge = ({ conversation, messages, userId, selectedConversationId }: { 
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
      unreadCount = messages.filter(msg => msg.sender_id !== userId).length;
    } else {
      // Count messages after the last_viewed_at timestamp and not from current user
      const lastViewedTime = new Date(lastViewedAt).getTime();
      unreadCount = messages.filter(msg => {
        const messageTime = new Date(msg.created_at || msg.timestamp).getTime();
        return messageTime > lastViewedTime && msg.sender_id !== userId;
      }).length;
    }
  } else if (conversation.unreadCount && conversation.unreadCount > 0) {
    // If no messages are loaded but conversation has unreadCount, use that
    unreadCount = conversation.unreadCount;
  } else if (!lastViewedAt && conversation.last_message && conversation.last_message.sender_id !== userId) {
    // If no last_viewed_at and there's a last message not from the user, count it as unread
    unreadCount = 1;
  }
  
  // If no unread messages, don't show anything
  if (unreadCount <= 0) return null;
  
  return (
    <div className="flex items-center ml-auto" data-testid={`unread-badge-count-${unreadCount}`}>
      <div className="bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-medium shadow-sm">
        {unreadCount > 99 ? '99+' : unreadCount}
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
    isTempConversation
  } = useMessages()!;
  
  const {
    sessions,
    refreshSessions,
  } = useSessions();
  
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  // Track initial page load status to control loading indicators
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Keep a stable reference to conversations to prevent flickering
  const conversationsRef = useRef<any[]>([]);
  
  // Update the ref when conversations change but aren't empty
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      conversationsRef.current = conversations;
    }
  }, [conversations]);
  
  // Get the most stable version of conversations - either current state or ref
  const stableConversations = conversations.length > 0 ? conversations : conversationsRef.current;
  
  // Track conversations that have had their messages loaded to prevent redundant API calls
  const loadedConversationsRef = useRef<Set<string>>(new Set());
  
  // Add a flag to prevent concurrent requests for the same conversation
  const fetchInProgressRef = useRef<{[conversationId: string]: boolean}>({});
  
  // Effect to set initial load status to false after the first load
  useEffect(() => {
    if (!loading && stableConversations.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, stableConversations, isInitialLoad]);
  
  // Get URL query parameters
  const conversationId = searchParams?.get('conversationId') || null;
  const messageId = searchParams?.get('messageId') || null;
  const sessionId = searchParams?.get('sessionId') || null;
  
  // Message element refs map to track message elements by ID
  const messageElementRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Get realtime context
  const { subscribeToConversation: subscribeToConversationOriginal, broadcastTypingIndicator, unsubscribeFromConversation } = useRealtime();
  
  // Memoize the subscription function to prevent redundant API calls
  const subscribeToConversation = useCallback((conversationId: string) => {
    console.log(`Memoized subscription to conversation: ${conversationId}`);
    subscribeToConversationOriginal(conversationId);
  }, [subscribeToConversationOriginal]);
  
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
    console.log("Refreshing sessions on messages page load");
    refreshSessions(); // Keep this initial refresh for page load
  }, [refreshSessions]);
  
  // Handle URL query parameters on component mount
  useEffect(() => {
    // If conversationId is provided in URL, select that conversation
    if (conversationId && stableConversations.some((c: any) => c.id === conversationId)) {
      console.log(`Setting conversation from URL param: ${conversationId}`);
      setSelectedConversationId(conversationId);
    }
  }, [conversationId, stableConversations, setSelectedConversationId]);
  
  // Effect to log when we're handling conversation ID changes
  useEffect(() => {
    if (selectedConversationId) {
      console.log(`Selected conversation: ${selectedConversationId}`);
      
      // Only load messages if we haven't loaded them before
      // This prevents redundant API calls
      if (!loadedConversationsRef.current.has(selectedConversationId)) {
        console.log(`First time loading messages for conversation: ${selectedConversationId}`);
        loadedConversationsRef.current.add(selectedConversationId);
      } else {
        console.log(`Using cached messages for conversation: ${selectedConversationId}`);
      }
    }
  }, [selectedConversationId]);
  
  // Scroll to specific message when messages are loaded and message ID is provided
  useEffect(() => {
    if (messageId && selectedConversationId && messages[selectedConversationId] && !loadingMessages) {
      isJumpingToSpecificMessage.current = true;
      
      // Find the message element and scroll to it
      const messageElement = messageElementRefs.current[messageId];
      if (messageElement) {
        console.log(`Scrolling to message: ${messageId}`);
        setTimeout(() => {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the message temporarily
          messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30');
          setTimeout(() => {
            messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30');
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
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        // Set the conversation and message IDs
        setSelectedConversationId(session.conversation_id);
      }
    }
  }, [sessionId, sessions, setSelectedConversationId]);
  
  // Local state for the UI
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  
  // Session scheduling state
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionCost, setSessionCost] = useState<number>(1);
  const [isSchedulingSession, setIsSchedulingSession] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  
  // Typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add a ref to track previous message counts by conversation
  const previousMessageCountRef = useRef<{[conversationId: string]: number}>({});
  
  // Redirect if not logged in
  if (!user) {
    redirect("/login");
  }
  
  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    return stableConversations.filter((convo: any) => 
      convo.participant?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
    if (messagesEndRef.current && !messageId && !sessionId && !isJumpingToSpecificMessage.current) {
      const isInitialLoad = selectedConversationId && 
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
          behavior: isInitialLoad ? "auto" : "smooth"
        });
      }
    }
  }, [messages, messageId, sessionId, selectedConversationId]);
  
  // Conversation read state is now handled directly in the onClick handler when selecting a conversation

  // Effect to subscribe to realtime updates when conversation changes
  useEffect(() => {
    // Create a cleanup flag to ensure we don't update state after unmount
    let isActive = true;
    let currentChannels: {[id: string]: any} = {};
    
    if (selectedConversationId) {
      console.log(`Setting up subscription to conversation: ${selectedConversationId}`);
      
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
        Object.keys(currentChannels).forEach(conversationId => {
          console.log(`Cleaning up subscription for conversation: ${conversationId} (component unmounted or user logged out)`);
          unsubscribeFromConversation(conversationId);
        });
    }
    };
  }, [selectedConversationId, user, subscribeToConversation, unsubscribeFromConversation]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId || !user) return;

    try {
      setMessageText('');
      const content = messageText.trim();
      
      console.log(`Sending message to conversation ${selectedConversationId}: ${content}`);
      
      // Clear typing indicator
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      broadcastTypingIndicator(selectedConversationId, false);

      // Send the message
      const sentMessage = await sendMessage(selectedConversationId, content);
      console.log(`Message sent successfully:`, sentMessage);
      
      // Ensure the messages array exists for this conversation
      // This is important for new conversations that might not have messages yet
      if (!messages[selectedConversationId]) {
        console.log(`Initializing messages array for new conversation: ${selectedConversationId}`);
        refreshMessages(selectedConversationId);
      }
      
      // Scroll to bottom after sending
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again later."
      });
    }
  };

  // Create session string formatter
  const formatSessionRequest = (title: string, date: string) => {
    return `Session Request: ${title}`;
  };

  // Schedule a session
  const handleScheduleSession = async () => {
    if (!selectedConversationId || !sessionTitle || !sessionDate || !sessionTime || !user || !currentConversation) {
      return;
    }

    // Check if this is a temporary conversation ID first
    const isTempConversation = selectedConversationId.startsWith('temp-');
    if (isTempConversation) {
      toast({
        title: "Action Required",
        description: "Please send a message first to create a real conversation before scheduling a session.",
        variant: "destructive",
      });
      return;
    }

    // Ensure only tutors can create sessions
    if (user.role !== 'tutor') {
      toast({
        title: "Permission Denied",
        description: "Only tutors can schedule tutoring sessions.",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time
    const dateTime = `${sessionDate}T${sessionTime}:00`;
    const formattedMessage = formatSessionRequest(sessionTitle, dateTime);
    
    // Validate that the session is not scheduled in the past
    const scheduledDateTime = new Date(dateTime);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      toast({
        title: "Invalid Date",
        description: "Sessions cannot be scheduled in the past. Please select a future date and time.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSchedulingSession(true);
      
      // Log current user info
      console.log("User attempting to schedule session:", {
        userId: user.id,
        role: user.role,
        tokens: user.tokens
      });
      
      // Find the other participant in the conversation first to determine roles
      const otherParticipant = currentConversation.participants.find(
        (p) => p.user_id !== user.id
      );
      
      if (!otherParticipant) {
        throw new Error("Could not identify the conversation participant");
      }
      
      // Since we already validated user is a tutor, set roles accordingly
      const tutorId = user.id;
      const studentId = otherParticipant.user_id;
      
      console.log("Session roles:", { tutorId, studentId, isTutor: true });
      
      // STEP 1: Create the session first (without message ID)
      const sessionRequest = {
        conversation_id: selectedConversationId,
        tutor_id: tutorId,
        student_id: studentId,
        name: sessionTitle,
        scheduled_for: dateTime,
        status: "requested",
        cost: sessionCost
      };
      
      console.log("Creating session without message ID first");
      const sessionResponse = await fetch("/api/tutoring-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionRequest),
        credentials: 'include'
      });
      
      // Check for non-2xx responses and get the error message
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        console.error("Session creation error response:", errorData);
        
        // Check for token-specific errors with expanded criteria
        if (errorData.error) {
          const errorLower = errorData.error.toLowerCase();
          if (
            errorLower.includes("token") || 
            errorLower.includes("insufficient") || 
            errorLower.includes("enough") || 
            errorLower.includes("credit")
          ) {
            toast({
              title: "Insufficient Tokens",
              description: errorData.error,
              variant: "destructive",
            });
          } else {
            // Generic error
            throw new Error(errorData.error || "Failed to create tutoring session");
          }
        } else {
          throw new Error("Failed to create tutoring session");
        }
        return;
      }
      
      // Session created successfully
      const responseData = await sessionResponse.json();
      const session = responseData.session;
      console.log("Session created successfully:", session);
      
      if (!session || !session.id) {
        throw new Error("Failed to create session: Invalid response");
      }
      
      // STEP 2: Now send the message
      console.log("Sending session request message");
      const sentMessage = await sendMessage(selectedConversationId, formattedMessage, { maxRetries: 3 });
      
      if (!sentMessage || !sentMessage.id) {
        // If message sending fails, we should clean up the session
        console.error("Failed to send message, cleaning up session");
        toast({
          title: "Error",
          description: "Failed to send session message. The session has been created but may not display correctly.",
          variant: "destructive",
        });
        
        // Continue with session but without message
        await refreshSessions();
        setSessionTitle("");
        setSessionDate("");
        setSessionTime("");
        setShowSessionDialog(false);
        return;
      }
      
      // STEP 3: Update the session with the message ID
      console.log("Updating session with message ID:", sentMessage.id);
      const updateResponse = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          action: "update_message_id",
          message_id: sentMessage.id
        }),
        credentials: 'include'
      });
      
      if (!updateResponse.ok) {
        console.error("Failed to update session with message ID");
        // This is not a critical error, so we continue
      } else {
        console.log("Session updated with message ID successfully");
      }
      
      // Force refresh sessions to ensure UI shows the card immediately
      await refreshSessions();
      
      // Also refresh messages to get the proper view with session card
      if (selectedConversationId) {
        await refreshMessages(selectedConversationId);
      }
      
      // Session created successfully
      setSessionTitle("");
      setSessionDate("");
      setSessionTime("");
      setShowSessionDialog(false);
      
      toast({
        title: "Success",
        description: "Session request created successfully.",
      });
    } catch (error) {
      console.error("Error scheduling session:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSchedulingSession(false);
    }
  };

  // Use a useLayoutEffect to immediately scroll to bottom on first render of messages
  // This runs synchronously after DOM updates but before browser paint
  useLayoutEffect(() => {
    if (selectedConversationId && 
        messages[selectedConversationId]?.length > 0 && 
        !messageId && !sessionId && !isJumpingToSpecificMessage.current) {
      
      // Directly scroll to bottom without animation
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        
        // Set flag for auto-scrolling since user hasn't manually scrolled yet
        shouldAutoScrollRef.current = true;
      }
    }
  }, [selectedConversationId, messages, messageId, sessionId]);

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
  const renderMessageStatus = (status?: 'sending' | 'sent' | 'delivered' | 'error') => {
    if (!status) return null;
    
    switch (status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 animate-spin ml-1 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 ml-1 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 ml-1 text-blue-500" />;
      case 'error':
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
    const otherUserTyping = conversationTypers.some((typer: any) => 
      typer.userId !== user?.id && typer.isTyping
    );
    
    return otherUserTyping;
  }, [selectedConversationId, typingStates, user?.id]);

  // Get the name of the person typing
  const getTypingDisplayName = useCallback(() => {
    if (!selectedConversationId || !currentConversation) return '';
    
    // Get typing users for the conversation (excluding the current user)
    const typingUsers = (typingStates[selectedConversationId] || [])
      .filter((typer: any) => typer.userId !== user?.id);
    
    // Get the first typing user's name
    const typingUser = typingUsers[0];
    if (typingUser?.displayName) {
      return typingUser.displayName;
    }
    
    // Fallback to conversation participant name if available
    return currentConversation.participant?.display_name || 'Someone';
  }, [selectedConversationId, currentConversation, typingStates, user?.id]);

  // Format timestamp for messages
  const formatMessageTime = (timestamp: string | undefined): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return ''; // Invalid date
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If message is from today, show only time
    if (date >= today) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If message is from yesterday, show "Yesterday"
    if (date >= yesterday) {
      return 'Yesterday';
    }
    
    // If message is from this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show month, day and year
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Add a helper function to format the last message preview
  const formatMessagePreview = (message: { content?: string; id?: string; created_at?: string; sender_id?: string } | string | undefined): string => {
    if (!message) return "Start a conversation...";
    
    if (typeof message === 'string') {
      return message.length > 30 ? `${message.substring(0, 30)}...` : message;
    }
    
    if (message.content) {
      return message.content.length > 30 ? `${message.content.substring(0, 30)}...` : message.content;
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
        const currentUserParticipant = convo.participants?.find((p: any) => p.user_id === user.id);
        const lastViewedAt = currentUserParticipant?.last_viewed_at;
        const mightHaveUnread = convo.last_message && 
          (!lastViewedAt || 
           (new Date(convo.last_message.created_at).getTime() > new Date(lastViewedAt).getTime() &&
            convo.last_message.sender_id !== user.id));
        
        // Only load messages if truly necessary
        if ((hasUnreadCountFlag || mightHaveUnread)) {
          console.log(`Loading messages for conversation ${convo.id} to calculate unread count (no duplicates)`);
          
          // Mark this conversation as being fetched
          fetchInProgressRef.current[convo.id] = true;
          
          // Fetch messages with a try/catch block instead of chaining .finally()
          try {
            refreshMessages(convo.id);
          } catch (error) {
            console.error(`Error refreshing messages for conversation ${convo.id}:`, error);
          }
          
          // Set a timeout to clear the in-progress flag
          setTimeout(() => {
            fetchInProgressRef.current[convo.id] = false;
          }, 2000);
        }
      });
    }
  }, [conversations, user, messages, refreshMessages, selectedConversationId]);

  // Add a stable reference for messages to prevent flickering
  const messagesRef = useRef<{[conversationId: string]: any[]}>({});
  
  // Update the ref when messages change
  useEffect(() => {
    // Only update if we have actual messages
    if (messages && Object.keys(messages).length > 0) {
      // Create a new object to avoid reference issues
      const updatedMessages = {...messagesRef.current};
      
      // Copy each conversation's messages
      Object.keys(messages).forEach(convId => {
        if (messages[convId]?.length > 0) {
          updatedMessages[convId] = [...messages[convId]];
        }
      });
      
      messagesRef.current = updatedMessages;
    }
  }, [messages]);
  
  // Get the most stable version of messages - either current state or ref
  const getStableMessages = useCallback((conversationId: string) => {
    if (messages[conversationId]?.length > 0) {
      return messages[conversationId];
    }
    return messagesRef.current[conversationId] || [];
  }, [messages]);

  // Effect to load conversations and messages
  useEffect(() => {
    // Only load if no conversations are available yet
    if (stableConversations.length === 0 && !loading) {
      // Can't call refreshMessages without a conversation ID, so we should handle this differently
      // Rely on the existing page logic to load conversations
      return;
    } else if (selectedConversationId && !getStableMessages(selectedConversationId).length && !loadingMessages) {
      // If we have a selected conversation but no messages, prioritize loading those messages
      refreshMessages(selectedConversationId);
    }
    
    // Auto-scroll to bottom when messages load
    if (selectedConversationId && getStableMessages(selectedConversationId).length > 0) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [selectedConversationId, stableConversations.length, loading, loadingMessages, refreshMessages, getStableMessages]);

  // Format full date for date headers
  const formatFullDate = (date: Date): string => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(date, now)) {
      return 'Today';
    } else if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Helper to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
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
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [selectedConversationId, markConversationAsRead]);

  // Effect that monitors scroll position for scrolled state
  useEffect(() => {
    // Only run this effect if we're on a desktop device
    if (typeof window !== 'undefined' && window.innerWidth >= 640 && scrollAreaRef.current) {
      const checkScrollPosition = () => {
        if (scrollAreaRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
          const isScrolled = scrollTop < scrollHeight - clientHeight - 10;
          shouldAutoScrollRef.current = !isScrolled;
        }
      };

      const scrollContainer = scrollAreaRef.current;
      scrollContainer.addEventListener('scroll', checkScrollPosition);

      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', checkScrollPosition);
        }
      };
    }
  }, [selectedConversationId, messages]);

  // Auto-scroll when new messages appear, if user was scrolled to bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current && selectedConversationId && messages[selectedConversationId]?.length > 0) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, selectedConversationId]);

  // Automatically load messages when conversation changes, but with strict controls to prevent duplicate fetches
  useEffect(() => {
    if (!selectedConversationId) return;

    // Use a ref to track if the component is still mounted when the fetch completes
    const isMounted = { current: true };
    
    const loadMessages = async () => {
      try {
        // Check if this is a temporary conversation
        if (isTempConversation(selectedConversationId)) {
          console.log(`Not fetching messages for temporary conversation: ${selectedConversationId}`);
          return;
        }

        // Mark fetch as in progress to block any parallel requests
        if (fetchInProgressRef.current[selectedConversationId]) {
          console.log(`Skipping duplicate fetch for conversation: ${selectedConversationId}`);
          return;
        }
        
        fetchInProgressRef.current[selectedConversationId] = true;
        
        // Check if we already have messages for this conversation
        // Only fetch if we don't have messages or if it's a forced refresh
        const hasExistingMessages = getStableMessages(selectedConversationId).length > 0;
        
        if (!hasExistingMessages) {
          console.log(`Loading messages for conversation: ${selectedConversationId}`);
          
          try {
            // Load the messages
            await refreshMessages(selectedConversationId);
            
            // Mark this conversation as loaded
            if (isMounted.current) {
              loadedConversationsRef.current.add(selectedConversationId);
              
              // Mark as read after loading messages - this is a selected conversation
              if (isMounted.current) {
                markConversationAsRead(selectedConversationId);
              }
            }
          } catch (error) {
            console.error(`Error loading messages:`, error);
          }
        } else {
          console.log(`Using existing messages for conversation: ${selectedConversationId}`);
          
          // Still mark as read when selecting a conversation with existing messages
          if (isMounted.current) {
            markConversationAsRead(selectedConversationId);
          }
        }
      } catch (error) {
        console.error(`Error loading messages for conversation ${selectedConversationId}:`, error);
      } finally {
        // Clear the in-progress flag after a delay to prevent rapid refetching
        setTimeout(() => {
          if (isMounted.current) {
            fetchInProgressRef.current[selectedConversationId] = false;
          }
        }, 2000); // 2-second cooldown
      }
    };
    
    loadMessages();
    
    // Cleanup function
    return () => {
      // Mark component as unmounted to prevent state updates after unmount
      isMounted.current = false;
    };
  }, [selectedConversationId, refreshMessages, markConversationAsRead, getStableMessages, isTempConversation]);

  // Check if current conversation is temporary
  const isCurrentConversationTemp = selectedConversationId ? 
    isTempConversation(selectedConversationId) : false;

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      <div className="flex h-full max-h-[calc(100vh-4rem)]">
        {/* Left sidebar - dashboard navigation has been removed */}
        
        {/* Middle column - conversations list */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
              />
            </div>
          </div>
          
          <div className="flex-grow overflow-auto">
            {loading && isInitialLoad ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-500">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredConversations.map((convo: any) => (
                  <div
                    key={convo.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${
                      selectedConversationId === convo.id
                        ? "bg-gray-100 dark:bg-gray-800/80"
                        : ""
                    }`}
                    onClick={() => {
                      // Only mark as read and set selected conversation if it changes
                      if (selectedConversationId !== convo.id) {
                        console.log(`Selecting conversation ${convo.id} and marking as read if needed`);
                        
                        // Set selected conversation ID first
                        setSelectedConversationId(convo.id);
                        
                        // Check if conversation has unread messages before trying to mark as read
                        if (hasUnreadMessages(convo.id)) {
                          console.log(`Conversation ${convo.id} has unread messages, marking as read`);
                          markConversationAsRead(convo.id)
                            .then((success: any) => {
                              if (!success) {
                                console.error(`Failed to mark conversation ${convo.id} as read`);
                              }
                            })
                            .catch((err: any) => {
                              console.error(`Error marking conversation as read: ${err}`);
                            });
                        }
                      }
                    }}
                  >
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={convo.participant?.avatar_url || undefined} alt={convo.participant?.display_name || 'User'} />
                        <AvatarFallback>
                          {convo.participant?.display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium truncate">
                            {convo.participant?.display_name || "Unknown user"}
                            {convo.participant?.is_tutor && (
                              <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                                Tutor
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 whitespace-nowrap ml-1">
                            {formatMessageTime(convo.last_message_at || convo.last_message?.created_at)}
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500 truncate">
                              {formatMessagePreview(convo.last_message)}
                            </p>
                            {isUserTyping(convo.id) && (
                              <p className="text-xs text-primary">
                                Typing...
                              </p>
                            )}
                            <UnreadBadge 
                              conversation={convo} 
                              messages={messages[convo.id] || []} 
                              userId={user?.id || ''} 
                              selectedConversationId={selectedConversationId}
                            />
                          </div>
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
        <div className="hidden sm:flex flex-col flex-1 h-[calc(100vh-4rem)]">
          {selectedConversationId && currentConversation ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={currentConversation?.participant?.avatar_url || undefined} />
                    <AvatarFallback>
                      {currentConversation?.participant?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{currentConversation?.participant?.display_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      French, Spanish, ESL {/* Replace with actual subjects */}
                    </p>
                  </div>
                </div>
                
                {/* Schedule Session button - only shown to tutors */}
                {user?.role === 'tutor' && (
                <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setShowSessionDialog(true)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule a Session</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label htmlFor="session-title" className="text-sm font-medium">
                          Title
                        </label>
                        <Input
                          id="session-title"
                          placeholder="e.g., Spanish Vocabulary Review"
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label htmlFor="session-date" className="text-sm font-medium">
                            Date
                          </label>
                          <Input
                            id="session-date"
                            type="date"
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="session-time" className="text-sm font-medium">
                            Time
                          </label>
                          <Input
                            id="session-time"
                            type="time"
                            value={sessionTime}
                            onChange={(e) => setSessionTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="session-cost" className="text-sm font-medium">
                          Cost (tokens)
                        </label>
                        <Input
                          id="session-cost"
                          type="number"
                          min="1"
                          step="1"
                          value={sessionCost}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setSessionCost(isNaN(value) || value < 1 ? 1 : value);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Students will need this many tokens to accept the session
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowSessionDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        onClick={handleScheduleSession}
                        disabled={isSchedulingSession || !sessionTitle || !sessionDate || !sessionTime}
                      >
                        {isSchedulingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Schedule
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                )}
              </div>

              {/* Temporary conversation alert - Make it more compact and fixed position */}
              {isCurrentConversationTemp && (
                <Alert className="mx-4 mt-4 py-1.5 flex items-center bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <div className="ml-2 flex-grow">
                    <AlertTitle className="text-xs font-medium">Draft conversation</AlertTitle>
                    <AlertDescription className="text-xs">
                      Send a message to create this conversation.
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <ScrollArea 
                className="flex-1 p-4 min-h-[calc(100vh-17rem)] h-full" 
                ref={scrollAreaRef} 
                onScroll={handleScroll}
              >
                {loadingMessages && isInitialLoad ? (
                  <div className="flex items-center justify-center h-full flex-grow">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : selectedConversationId ? (
                  // Use getStableMessages to get the most reliable version of the messages
                  getStableMessages(selectedConversationId).length === 0 ? (
                    <div className="flex items-center justify-center h-full flex-grow">
                      <div className="text-center">
                        <div className="flex justify-center mb-3">
                          <MessageSquare className="h-10 w-10 text-primary opacity-70" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">Start a conversation!</h3>
                        <p className="text-sm text-muted-foreground">
                          Send a message below to begin chatting
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 min-h-full flex flex-col">
                      {getStableMessages(selectedConversationId).map((message: any) => {
                        // Always use a stable key based on ID to maintain component identity
                        // This is critical for smooth transitions between sending/sent states
                        const uniqueMessageKey = `message-fragment-${message.id}`;
                        
                        const isFromMe = message.sender_id === user.id;
                        
                        // Get date info for this message
                        const currentDate = message.created_at ? new Date(message.created_at) : new Date();
                        
                        // Find previous message for date comparison (without modifying array)
                        const currentMsgIndex = getStableMessages(selectedConversationId).findIndex(m => m.id === message.id);
                        const prevMessage = currentMsgIndex > 0 ? getStableMessages(selectedConversationId)[currentMsgIndex - 1] : null;
                        const prevDate = prevMessage?.created_at ? new Date(prevMessage.created_at) : null;
                        
                        // Only show date header when the date changes (not for every message)
                        const showDateHeader = !prevDate || !isSameDay(currentDate, prevDate);
                        
                        // Find session data
                        const associatedSession = sessions.find(s => s.message_id === message.id);
                        
                        // Check if message is a session request
                        const isSessionRequest = message.isSessionRequest || 
                                               (message.content && message.content.startsWith('Session Request:'));
                        
                        // Create a temporary session object for session request messages without a session
                        let sessionData = associatedSession;
                        if (!sessionData && isSessionRequest) {
                          const { title, scheduledFor } = parseSessionRequest(message.content);
                          sessionData = {
                            id: `pending-${message.id}`,
                            message_id: message.id,
                            name: title,
                            scheduled_for: scheduledFor,
                            status: "requested",
                            tutor_ready: false,
                            student_ready: false,
                            conversation_id: selectedConversationId,
                            tutor_id: '',
                            student_id: '',
                            cost: 1
                          };
                        }
                        
                        // Store a reference to the message element
                        const setMessageRef = (el: HTMLDivElement | null) => {
                          if (el) {
                            messageElementRefs.current[message.id] = el;
                          }
                        };
                        
                        return (
                          <React.Fragment key={uniqueMessageKey}>
                            {showDateHeader && (
                              <div className="flex justify-center my-4" key={`date-header-${message.id}`}>
                                <div className="bg-muted px-3 py-1 rounded-full text-xs">
                                  {formatFullDate(currentDate)}
                                </div>
                              </div>
                            )}
                            
                            {/* Render session request UI if there's an associated session */}
                            {(sessionData || isSessionRequest) ? (
                              <div
                                ref={setMessageRef}
                                className={`flex ${isFromMe ? "justify-end" : "justify-start"} w-full transition-colors duration-500`}
                                id={`message-container-${message.id}`}
                              >
                                {!isFromMe && (
                                  <Avatar className="h-10 w-10 mr-2 mt-1 flex-shrink-0">
                                    <AvatarImage src={currentConversation?.participant?.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {currentConversation?.participant?.display_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="max-w-[85%] w-full">
                                  <SessionRequestCard 
                                    messageId={message.id}
                                    conversationId={selectedConversationId}
                                    sessionId={sessionData?.id}
                                    title={sessionData?.name || 'Untitled Session'}
                                    scheduledFor={sessionData?.scheduled_for || new Date().toISOString()}
                                    status={(sessionData?.status as "requested" | "accepted" | "started" | "ended" | "cancelled") || 'requested'}
                                    tutorReady={sessionData?.tutor_ready || false}
                                    studentReady={sessionData?.student_ready || false}
                                    cost={sessionData?.cost || 1}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1 px-1">
                                    {message.created_at ? new Date(message.created_at).toLocaleTimeString() : 'Unknown time'}
                                  </p>
                                </div>
                                {isFromMe && (
                                  <Avatar className="h-10 w-10 ml-2 mt-1 flex-shrink-0">
                                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            ) : (
                              <div
                                ref={setMessageRef}
                                className={`flex ${isFromMe ? "justify-end" : "justify-start"} transition-colors duration-500`}
                                id={`message-container-${message.id}`}
                              >
                                {!isFromMe && (
                                  <Avatar className="h-10 w-10 mr-2 mt-1 flex-shrink-0">
                                    <AvatarImage src={currentConversation?.participant?.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {currentConversation?.participant?.display_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="max-w-[70%]">
                                  <div
                                    className={`px-4 py-2 rounded-lg ${
                                      isFromMe
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                    }`}
                                  >
                                    <p className="break-words whitespace-pre-line">{message.content}</p>
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground mt-1 px-1">
                                    <span>
                                      {message.created_at ? new Date(message.created_at).toLocaleTimeString() : 'Unknown time'}
                                    </span>
                                    {isFromMe && renderMessageStatus(message.status)}
                                  </div>
                                </div>
                                {isFromMe && (
                                  <Avatar className="h-10 w-10 ml-2 mt-1 flex-shrink-0">
                                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Typing indicator */}
                      {someoneIsTyping() && (
                        <div className="flex items-start">
                          <Avatar className="h-10 w-10 mr-2 mt-1 flex-shrink-0">
                            <AvatarImage src={currentConversation?.participant?.avatar_url || undefined} />
                            <AvatarFallback>
                              {currentConversation?.participant?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted px-4 py-2 rounded-lg">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-2">
                            {getTypingDisplayName()} is typing...
                          </p>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full flex-grow">
                    <div className="text-center">
                      <h3 className="font-medium mb-1">Select a conversation</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a conversation from the list to start chatting
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Message input */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    className="flex-1"
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="font-medium mb-1">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 