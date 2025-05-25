"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  PlayCircle,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { useMessages } from "@/context/MessageContext";
import { useRealtime } from "@/context/RealtimeContext";
import { useToast } from "@/components/ui/use-toast";
import { getMessageLink } from "@/utils/messageLinks";
import { usePathname } from 'next/navigation';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SessionLink } from "@/components/SessionLink";

interface SessionRequestCardProps {
  messageId: string;
  conversationId: string;
  sessionId?: string;
  title: string;
  scheduledFor: string;
  status: "requested" | "accepted" | "started" | "ended" | "cancelled";
  tutorReady?: boolean;
  studentReady?: boolean;
  cost?: number;
}

// Helper for parsing session request messages
export function parseSessionRequest(messageContent: string) {
  let title = "Tutoring Session";
  let scheduledFor = new Date().toISOString();

  if (messageContent) {
    // Extract title from the message 
    const titleMatch = messageContent.match(/Session Request: (.*?)(?:\n|$)/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // Extract date from the message
    const dateMatch = messageContent.match(/Scheduled for: (.*?)(?:\n|$)/);
    if (dateMatch && dateMatch[1]) {
      scheduledFor = dateMatch[1].trim();
    }
  }
  
  return { title, scheduledFor };
}

export function SessionRequestCard({
  messageId,
  conversationId,
  sessionId,
  title,
  scheduledFor,
  status = "requested",
  tutorReady = false,
  studentReady = false,
  cost
}: SessionRequestCardProps) {
  const { user } = useAuth();
  const { sessions, refreshSessions } = useSessions();
  const { subscribeToConversation } = useRealtime();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [messageCreatorId, setMessageCreatorId] = useState<string | null>(null);
  const [isCreatedByTutor, setIsCreatedByTutor] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSession, setPendingSession] = useState<{title: string, scheduledFor: string} | null>(null);
  const [messageContent, setMessageContent] = useState<string | null>(null);
  const isTutor = user?.role === "tutor";
  const pathname = usePathname();
  
  // Check if we're already in the messages page
  const isInMessagesPage = pathname === '/dashboard/messages';

  // Format the date for display
  const formattedDate = scheduledFor 
    ? format(parseISO(scheduledFor), "EEE, MMM d, h:mm a")
    : "Date not set";
    
  // Subscribe to conversation for realtime updates
  useEffect(() => {
    if (conversationId) {
      subscribeToConversation(conversationId);
    }
  }, [conversationId, subscribeToConversation]);

  // Fetch message details to determine who created it and if it should be a session
  useEffect(() => {
    const fetchMessageDetails = async () => {
      if (!messageId || !conversationId) return;
      
      try {
        setIsLoading(true);
        
        // Skip API calls for temporary conversations
        if (conversationId.startsWith('temp-')) {
          console.log("Skipping API call for temporary conversation:", conversationId);
          setIsCreatedByTutor(user?.role === 'tutor');
          setIsLoading(false);
          return;
        }
        
        const response = await fetch(`/api/messages?conversation_id=${conversationId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        const message = data.messages?.find((msg: any) => msg.id === messageId);
        
        if (message) {
          setMessageCreatorId(message.sender_id);
          setMessageContent(message.content);
          
          // Determine if the message was created by a tutor
          const messageCreator = message.sender;
          setIsCreatedByTutor(messageCreator?.is_tutor || false);
          
          // Check if this message content matches a session request pattern
          if (message.content && message.content.startsWith('Session Request:')) {
            console.log("Message content matches Session Request pattern");
            const sessionDetails = parseSessionRequest(message.content);
            setPendingSession(sessionDetails);
          }
        }
      } catch (error) {
        console.error('Error fetching message details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessageDetails();
  }, [messageId, conversationId, user?.role]);

  // Fetch session if it doesn't exist yet but should
  useEffect(() => {
    // If we don't have a sessionId but we have messageId and conversationId,
    // we might be in a state where the session was just created
    // but not yet associated with the message in the UI
    if (!sessionId && messageId && conversationId) {
      // Skip API calls for temporary conversations
      if (conversationId.startsWith('temp-')) {
        console.log("Skipping session check for temporary conversation:", conversationId);
        setIsLoading(false);
        return;
      }
      
      // Check if the message content looks like a session request 
      const checkForSession = async () => {
        try {
          console.log(`Looking up session for message: ${messageId}`);
          setIsLoading(true);
          
          // Try to fetch the session directly by message ID
          const response = await fetch(`/api/tutoring-sessions?message_id=${messageId}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.session) {
              console.log("Found session for message:", data.session);
              
              // Force refresh sessions to update the UI
              await refreshSessions();
              
              // Clear loading state after successful refresh
              setTimeout(() => setIsLoading(false), 300);
              return;
            }
          }
          
          // If we can't find a session but the message should have one,
          // try refreshing sessions to see if that helps
          refreshSessions();
          setIsLoading(false);
        } catch (error) {
          console.error("Error checking for session:", error);
          setIsLoading(false);
        }
      };
      
      checkForSession();
    } else {
      // We already have a session ID or don't need one
      setIsLoading(false);
    }
  }, [messageId, conversationId, sessionId, refreshSessions]);

  // Handle accepting a session request (for tutors)
  const handleAcceptSession = async () => {
    if (!conversationId || !messageId || !user) return;
    
    setLoading(true);
    try {
      // Check if this is a temporary conversation ID first
      const isTempConversation = conversationId.startsWith('temp-');
      if (isTempConversation) {
        console.error("Cannot create session with temporary conversation ID");
        toast({
          title: "Action Required",
          description: "Please send a message first to create a real conversation before scheduling a session.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Log the user information for debugging
      console.log("User accepting session:", {
        userId: user.id,
        role: user.role,
        isTutor,
        tokens: user.tokens
      });

      if (sessionId) {
        // If sessionId already exists, we just need to update the status to 'accepted'
        const response = await fetch("/api/tutoring-sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            action: "update_status",
            status: "accepted"
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Session acceptance error:", errorData);
          
          // Enhanced token-related error detection
          const errorMessage = errorData.error || "Failed to accept session";
          const errorLower = errorMessage.toLowerCase();
          if (
            errorLower.includes("token") || 
            errorLower.includes("insufficient") ||
            errorLower.includes("enough") ||
            errorLower.includes("credit")
          ) {
            toast({
              title: "Insufficient Tokens",
              description: errorMessage,
              variant: "destructive",
            });
            setLoading(false);
            return; // Early return to prevent showing the success toast
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log("Session accepted successfully:", data.session);
      } else {
        // Otherwise, we need to create a new session
        // First, get the other participant ID from the conversation
        const conversationResponse = await fetch(`/api/conversations?conversation_id=${conversationId}`, {
          credentials: 'include'
        });
        
        if (!conversationResponse.ok) {
          const errorText = await conversationResponse.text();
          console.error(`Failed to fetch conversation details: ${errorText}`);
          throw new Error("Failed to fetch conversation details");
        }
        
        const conversationData = await conversationResponse.json();
        const conversation = conversationData.conversation;
        
        if (!conversation) {
          console.error("No conversation returned:", conversationData);
          throw new Error("Conversation not found");
        }
        
        // Find the other participant (not the current user)
        const otherParticipant = conversation.participants.find(
          (p: any) => p.user_id !== user.id
        );
        
        if (!otherParticipant) {
          console.error("Participants in conversation:", conversation.participants);
          throw new Error("Could not identify the other participant");
        }
        
        // Determine tutor and student IDs
        const tutorId = isTutor ? user.id : otherParticipant.user_id;
        const studentId = isTutor ? otherParticipant.user_id : user.id;
        
        console.log("Creating session with:", {
          conversationId,
          messageId,
          tutorId,
          studentId,
          title,
          scheduledFor
        });
        
        // Create the session
        const sessionResponse = await fetch("/api/tutoring-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            message_id: messageId,
            tutor_id: tutorId,
            student_id: studentId,
            name: title,
            scheduled_for: scheduledFor,
            status: "accepted"
          }),
          credentials: 'include'
        });
        
        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json();
          console.error("Session creation failed:", errorData);
          
          // Enhanced token-related error detection
          const errorMessage = errorData.error || "Failed to create session";
          const errorLower = errorMessage.toLowerCase();
          if (
            errorLower.includes("token") || 
            errorLower.includes("insufficient") ||
            errorLower.includes("enough") ||
            errorLower.includes("credit")
          ) {
            toast({
              title: "Insufficient Tokens",
              description: errorMessage,
              variant: "destructive",
            });
            setLoading(false);
            return; // Early return to prevent showing the success toast
          }
          
          throw new Error(errorMessage);
        }
        
        const sessionData = await sessionResponse.json();
        console.log("Session created successfully:", sessionData.session);
        
        if (!sessionData.session || !sessionData.session.id) {
          console.error("No session ID returned:", sessionData);
          throw new Error("Session was not properly created");
        }
      }
      
      // No need to manually refresh sessions - realtime updates will handle this
      
      toast({
        title: "Session accepted",
        description: "The tutoring session has been confirmed",
      });
    } catch (error) {
      console.error("Error accepting session:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle ready status toggle
  const handleReadyToggle = async () => {
    if (!sessionId) return;
    
    // Check if this is a temporary conversation ID first
    const isTempConversation = conversationId.startsWith('temp-');
    if (isTempConversation) {
      console.error("Cannot update session with temporary conversation ID");
      toast({
        title: "Action Required",
        description: "Please send a message first to create a real conversation before managing sessions.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const currentStatus = isTutor ? tutorReady : studentReady;
      
      const response = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          action: "set_ready",
          is_ready: !currentStatus
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update ready status");
      }
      
      // No need to manually refresh sessions - realtime updates will handle this
      
      toast({
        title: currentStatus ? "Not Ready" : "Ready",
        description: currentStatus 
          ? "You've marked yourself as not ready for the session" 
          : "You're ready for the session",
      });
    } catch (error) {
      console.error("Error updating ready status:", error);
      toast({
        title: "Error",
        description: "Failed to update ready status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Handle starting a session
  const handleStartSession = async () => {
    if (!sessionId) return;
    
    // Check if this is a temporary conversation ID first
    const isTempConversation = conversationId.startsWith('temp-');
    if (isTempConversation) {
      console.error("Cannot start session with temporary conversation ID");
      toast({
        title: "Action Required",
        description: "Please send a message first to create a real conversation before starting sessions.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          action: "update_status",
          status: "started"
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start session");
      }
      
      // No need to manually refresh sessions - realtime updates will handle this
      
      // Navigate to the session page
      window.location.href = `/session/${sessionId}`;
    } catch (error) {
      console.error("Error starting session:", error);
      toast({
        title: "Error",
        description: "Failed to start the session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle ending a session
  const handleEndSession = async () => {
    if (!sessionId) return;
    
    // Check if this is a temporary conversation ID first
    const isTempConversation = conversationId.startsWith('temp-');
    if (isTempConversation) {
      console.error("Cannot end session with temporary conversation ID");
      toast({
        title: "Action Required",
        description: "Please send a message first to create a real conversation before ending sessions.",
        variant: "destructive",
      });
      return;
    }
    
    // Only tutors can end sessions
    if (!isTutor) {
      toast({
        title: "Permission Denied",
        description: "Only tutors can end active sessions.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          action: "update_status",
          status: "ended"
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to end session");
      }
      
      // No need to manually refresh sessions - realtime updates will handle this
      
      toast({
        title: "Session ended",
        description: "The tutoring session has ended",
      });
    } catch (error) {
      console.error("Error ending session:", error);
      toast({
        title: "Error",
        description: "Failed to end the session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle cancelling a session
  const handleCancelSession = async () => {
    if (!conversationId || (!messageId && !sessionId) || !user) return;
    
    // Check if this is a temporary conversation ID first
    const isTempConversation = conversationId.startsWith('temp-');
    if (isTempConversation) {
      console.error("Cannot manage session with temporary conversation ID");
      toast({
        title: "Action Required",
        description: "Please send a message first to create a real conversation before managing sessions.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      if (sessionId) {
        // Update existing session to cancelled
        const response = await fetch("/api/tutoring-sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            action: "update_status",
            status: "cancelled"
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error cancelling session:", errorData);
          
          // Enhanced token-related error detection
          const errorMessage = errorData.error || "Failed to cancel session";
          if (errorMessage.toLowerCase().includes("token") || 
              errorMessage.toLowerCase().includes("insufficient") ||
              errorMessage.toLowerCase().includes("enough")) {
            toast({
              title: "Insufficient Tokens",
              description: errorMessage,
              variant: "destructive",
            });
            setLoading(false);
            return; // Early return to prevent showing the success toast
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log("Session cancelled successfully:", data.session);
      } else {
        // Create a new session with cancelled status
        const conversationResponse = await fetch(`/api/conversations?conversation_id=${conversationId}`, {
          credentials: 'include'
        });
        
        if (!conversationResponse.ok) {
          const errorText = await conversationResponse.text();
          console.error(`Failed to fetch conversation: ${errorText}`);
          throw new Error("Failed to fetch conversation details");
        }
        
        const conversationData = await conversationResponse.json();
        const conversation = conversationData.conversation;
        
        if (!conversation) {
          console.error("Conversation not found:", conversationData);
          throw new Error("Conversation not found");
        }
        
        // Find the other participant (not the current user)
        const otherParticipant = conversation.participants.find(
          (p: any) => p.user_id !== user.id
        );
        
        if (!otherParticipant) {
          console.error("Participants:", conversation.participants);
          throw new Error("Could not identify the other participant");
        }
        
        // Determine tutor and student IDs
        const tutorId = user.role === "tutor" ? user.id : otherParticipant.user_id;
        const studentId = user.role === "tutor" ? otherParticipant.user_id : user.id;
        
        console.log("Creating cancelled session with:", {
          conversationId,
          messageId,
          tutorId,
          studentId,
          title,
          scheduledFor
        });
        
        // Create the session with cancelled status
        const sessionResponse = await fetch("/api/tutoring-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            message_id: messageId,
            tutor_id: tutorId,
            student_id: studentId,
            name: title,
            scheduled_for: scheduledFor,
            status: "cancelled"
          }),
          credentials: 'include'
        });
        
        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json();
          console.error("Failed to create cancelled session:", errorData);
          
          // Enhanced token-related error detection
          const errorMessage = errorData.error || "Failed to cancel session";
          if (errorMessage.toLowerCase().includes("token") || 
              errorMessage.toLowerCase().includes("insufficient") ||
              errorMessage.toLowerCase().includes("enough")) {
            toast({
              title: "Insufficient Tokens",
              description: errorMessage,
              variant: "destructive",
            });
            setLoading(false);
            return; // Early return to prevent showing the success toast
          }
          
          throw new Error(errorMessage);
        }
        
        const sessionData = await sessionResponse.json();
        console.log("Cancelled session created:", sessionData.session);
      }
      
      // No need to manually refresh sessions - realtime updates will handle this
      
      toast({
        title: "Session cancelled",
        description: "The tutoring session has been cancelled",
      });
      
      setShowCancelDialog(false);
    } catch (error) {
      console.error("Error cancelling session:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel the session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (status) {
      case "requested":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-400 bg-amber-50 dark:bg-yellow-950/30 dark:text-yellow-300 rounded-full px-4 py-0.5 font-medium">Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="text-blue-600 border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 rounded-full px-4 py-0.5 font-medium">Scheduled</Badge>;
      case "started":
        return <Badge variant="outline" className="text-green-600 border-green-400 bg-green-50 dark:bg-green-950/30 dark:text-green-300 rounded-full px-4 py-0.5 font-medium">In Progress</Badge>;
      case "ended":
        return <Badge variant="outline" className="text-gray-600 border-gray-400 bg-gray-50 dark:bg-gray-950/30 dark:text-gray-300 rounded-full px-4 py-0.5 font-medium">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-red-600 border-red-400 bg-red-50 dark:bg-red-950/30 dark:text-red-300 rounded-full px-4 py-0.5 font-medium">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="rounded-full px-4 py-0.5 font-medium">Unknown</Badge>;
    }
  };

  // Show ready status indicators
  const renderReadyStatus = () => {
    if (status !== "accepted") return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Badge variant={tutorReady ? "default" : "outline"} className="text-xs">
            Tutor {tutorReady ? "Ready ✓" : "Not Ready"}
          </Badge>
        </span>
        <span className="flex items-center gap-1">
          <Badge variant={studentReady ? "default" : "outline"} className="text-xs">
            Student {studentReady ? "Ready ✓" : "Not Ready"}
          </Badge>
        </span>
      </div>
    );
  };

  // Generate message link for the session
  const messageLink = getMessageLink(conversationId, messageId);

  // Determine who should see the accept button
  // If tutor created session request - student should see accept button
  // If student created session request - tutor should see accept button
  const shouldShowAcceptButton = () => {
    // Don't show accept button if still loading or no session data is available yet
    if (isLoading || isCreatedByTutor === null) return false;
    
    // Only show the accept button if we have a valid sessionId
    // This prevents showing the button until the message is properly connected to a session
    if (!sessionId) return false;
    
    if (isCreatedByTutor) {
      // If tutor created it, student should accept
      return !isTutor;
    } else {
      // If student created it, tutor should accept
      return isTutor;
    }
  };

  // If the session is cancelled, render the cancelled card
  if (status === "cancelled") {
    return (
      <Card className="bg-red-50 border border-red-200 shadow-sm dark:bg-red-950/20 dark:border-red-800">
        <CardContent className="pt-4 pb-2">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 dark:text-red-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-base text-red-800 dark:text-red-300">{title}</h3>
                {getStatusBadge()}
              </div>
              <div className="flex items-center text-sm text-red-700/70 dark:text-red-400/70">
                <Clock className="h-4 w-4 mr-1.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center text-sm text-red-700/70 dark:text-red-400/70 mt-1">
                <span className="font-medium">
                  {isLoading ? (
                    "Cost: Loading..."
                  ) : (
                    <>Cost: {cost ?? '...'} {cost ? (cost === 1 ? 'token' : 'tokens') : ''}</>
                  )}
                </span>
              </div>
              <div className="mt-3 text-sm text-red-700 dark:text-red-400">
                <p>This tutoring session has been cancelled and is no longer available.</p>
              </div>
            </div>
          </div>
        </CardContent>
        {!isInMessagesPage && (
          <CardFooter className="pt-2 pb-3">
            <SessionLink 
              conversationId={conversationId} 
              messageId={messageId}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              View in Messages
            </SessionLink>
          </CardFooter>
        )}
      </Card>
    );
  }

  // If we're in a pending state (detected session request but no session ID yet)
  if (!sessionId && pendingSession && !isLoading) {
    // We've detected this is likely a session request message, show placeholder card
    return (
      <Card className="bg-slate-50 border border-slate-200 shadow-sm dark:bg-slate-900/50 dark:border-slate-800 animate-pulse">
        <CardContent className="pt-4 pb-2">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-base">{pendingSession.title}</h3>
                <Badge variant="outline" className="text-blue-600 border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 rounded-full px-4 py-0.5 font-medium">
                  Loading...
                </Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1.5 text-muted-foreground/70" />
                <span>{format(parseISO(pendingSession.scheduledFor), "EEE, MMM d, h:mm a")}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <span className="font-medium">
                  {isLoading ? (
                    "Cost: Loading..."
                  ) : (
                    <>Cost: {cost ?? '...'} {cost ? (cost === 1 ? 'token' : 'tokens') : ''}</>
                  )}
                </span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading session...</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-50 border border-slate-200 shadow-sm dark:bg-slate-900/50 dark:border-slate-800">
      <CardContent className="pt-4 pb-2">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-base">{title}</h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1.5 text-muted-foreground/70" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <span className="font-medium">
                {isLoading ? (
                  "Cost: Loading..."
                ) : (
                  <>Cost: {cost ?? '...'} {cost ? (cost === 1 ? 'token' : 'tokens') : ''}</>
                )}
              </span>
            </div>
            {renderReadyStatus()}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-2 pb-3">
        {status === "requested" && (
          <>
            {shouldShowAcceptButton() ? (
              <>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleAcceptSession}
                  disabled={loading || isLoading}
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Accept
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={loading || isLoading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Decline Session Request</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to decline this tutoring session request? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleCancelSession}
                      >
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Decline
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <div className="w-full">
                <div className="flex flex-col space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={loading || isLoading}
                    onClick={() => setShowCancelDialog(true)}
                    className="flex items-center gap-2 w-fit"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Request
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? "Loading..." : (
                      isTutor ? 
                        "Waiting for student to accept..." : 
                        "Waiting for tutor to accept..."
                    )}
                  </p>
                </div>
                
                <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Session Request</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this tutoring session request? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Request</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleCancelSession}
                      >
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Cancel Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        )}
        
        {status === "accepted" && (
          <>
            <Button 
              variant={isTutor ? (tutorReady ? "outline" : "default") : (studentReady ? "outline" : "default")}
              size="sm"
              onClick={handleReadyToggle}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isTutor ? (tutorReady ? "Not Ready" : "Ready") : (studentReady ? "Not Ready" : "Ready")}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Tutoring Session</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this scheduled tutoring session? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Session</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleCancelSession}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Cancel Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {isTutor && tutorReady && studentReady && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartSession}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                Start Session
              </Button>
            )}
          </>
        )}
        
        {status === "started" && (
          <>
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping absolute"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full relative"></div>
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Session In Progress</p>
              </div>
              <div className="flex gap-2">
                {!isInMessagesPage && (
                  <SessionLink 
                    conversationId={conversationId} 
                    messageId={messageId}
                    variant="outline"
                    className="text-muted-foreground"
                  >
                    View in Messages
                  </SessionLink>
                )}
                {isTutor && (
                  <Button
                    variant="default" 
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleEndSession}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    End Session
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
        
        {status === "ended" && (
          <div className="w-full flex justify-between items-center">
            <p className="text-sm text-muted-foreground">This session has ended</p>
            {!isInMessagesPage && (
              <SessionLink 
                conversationId={conversationId} 
                messageId={messageId}
                variant="outline"
                className="text-muted-foreground"
              >
                View in Messages
              </SessionLink>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
} 