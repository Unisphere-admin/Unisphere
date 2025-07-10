"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
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
  MessageSquare,
  Video
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
import { getCsrfTokenFromStorage, CSRF_HEADER_NAME, useCsrfToken } from '@/lib/csrf/client';

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
  const { sessions, refreshSessions, updateSession } = useSessions();
  const { subscribeToConversation } = useRealtime();
  const { toast } = useToast();
  const { fetchCsrfToken } = useCsrfToken();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [messageCreatorId, setMessageCreatorId] = useState<string | null>(null);
  const [isCreatedByTutor, setIsCreatedByTutor] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSession, setPendingSession] = useState<{title: string, scheduledFor: string} | null>(null);
  const [messageContent, setMessageContent] = useState<string | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  
  // Use refs to track fetching state between renders
  const hasFetchedRef = useRef<boolean>(false);
  const apiRequestInProgressRef = useRef<boolean>(false);
  const messageCheckedRef = useRef<boolean>(false);
  
  const isTutor = user?.role === "tutor";
  const pathname = usePathname();
  
  // Check if we're already in the messages page
  const isInMessagesPage = pathname === '/dashboard/messages';

  // Format the date for display
  const formattedDate = scheduledFor 
    ? format(parseISO(scheduledFor), "EEE, MMM d, h:mm a")
    : "Date not set";
    
  // Subscribe to conversation for realtime updates - run in client only
  useEffect(() => {
    if (typeof window !== 'undefined' && conversationId) {
      subscribeToConversation(conversationId);
    }
  }, [conversationId, subscribeToConversation]);

  // Update local state from sessions context if session ID is available
  useEffect(() => {
    if (sessionId && sessions) {
      // Find the session in the context without making API calls
      const contextSession = sessions.find(s => s.id === sessionId);
      if (contextSession) {
        // No need to update local state as the parent component will receive updated props
        // This effect just ensures we don't make redundant API calls
      }
    }
  }, [sessionId, sessions]);

  // Fetch message details to determine who created it
  useEffect(() => {
    const fetchMessageDetails = async () => {
      // Skip if we already checked this message or don't have necessary IDs
      if (!messageId || !conversationId || messageCheckedRef.current) return;
      
      // Skip in SSR context
      if (typeof window === 'undefined') return;
      
      // Mark that we're checking this message to avoid duplicate fetches
      messageCheckedRef.current = true;
      
      try {
        // Skip API calls for temporary conversations
        if (conversationId.startsWith('temp-')) {
          setIsCreatedByTutor(user?.role === 'tutor');
          setIsLoading(false);
          return;
        }
        
        // First check the props for session details
        // If title starts with "Session Request:", it's likely from a tutor
        if (title && title.includes("Session Request")) {
          // Sessions are typically created by tutors, so set creator as tutor
          setIsCreatedByTutor(true);
        }
        
        // Only fetch message details if we're in the browser and need more information
        if (!isCreatedByTutor && !apiRequestInProgressRef.current) {
          apiRequestInProgressRef.current = true;
          
          startTransition(async () => {
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
              
              // Check message content for session request indicators
              if (message.content && message.content.trim().startsWith('Session Request:')) {
                // Session requests are typically created by tutors
                const messageCreator = message.sender;
                setIsCreatedByTutor(messageCreator?.is_tutor || true);
              } else {
                // Otherwise use sender info to determine if created by tutor
                const messageCreator = message.sender;
                setIsCreatedByTutor(messageCreator?.is_tutor || false);
              }
            }
            
            setIsLoading(false);
            apiRequestInProgressRef.current = false;
          });
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setIsLoading(false);
        apiRequestInProgressRef.current = false;
      }
    };
    
    fetchMessageDetails();
    
    // Clean up function
    return () => {
      apiRequestInProgressRef.current = false;
    };
  }, [messageId, conversationId, user?.role, title, isCreatedByTutor]);

  // Handle session fetch in a separate effect
  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === 'undefined') return;
    
    // If we don't have a sessionId but we have messageId and conversationId,
    // we might be in a state where the session was just created
    // but not yet associated with the message in the UI
    if (!sessionId && messageId && conversationId && !hasFetchedRef.current) {
      // Mark that we've attempted to fetch
      hasFetchedRef.current = true;
      
      // Skip API calls for temporary conversations
      if (conversationId.startsWith('temp-')) {
        setIsLoading(false);
        return;
      }

      // Check if the message content indicates this is a session request
      if (messageContent && messageContent.trim().startsWith('Session Request:')) {
        // This is definitely a session request, create a pending session placeholder
        if (!pendingSession) {
          setPendingSession({
            title: messageContent.replace(/^Session Request: /, '').trim() || title || "Tutoring Session",
            scheduledFor: scheduledFor || new Date().toISOString()
          });
        }
      }
      
      // Create a request key to prevent duplicate API calls
      const requestKey = `session_check_${messageId}`;
      const hasChecked = sessionStorage.getItem(requestKey);
      
      // Only check for a session if we don't already have one and there's a potential for it to exist
      const checkForSession = async () => {
        if (sessionId) {
          // We already have a session, no need to check
          setIsLoading(false);
          return;
        }
        
        // Skip if we've already checked this message
        if (hasChecked) {
          setIsLoading(false);
          return;
        }
        
        // Skip API calls if this doesn't look like a session request message
        const isSessionRequestMessage = messageContent && messageContent.trim().startsWith('Session Request:');
        if (!isSessionRequestMessage) {
          setIsLoading(false);
          return;
        }
        
        // Check existing sessions in context first to avoid an API call
        if (sessions && sessions.length > 0) {
          const existingSession = sessions.find(s => 
            s.message_id === messageId || 
            (s.conversation_id === conversationId && s.message_id)
          );
          
          if (existingSession) {
            // Session exists in context, no need for API call
            setIsLoading(false);
            sessionStorage.setItem(requestKey, 'true');
            return;
          }
        }
        
        try {
          // Only make the API call if we couldn't find it in context
          // and it looks like a session request
          if (!apiRequestInProgressRef.current) {
            apiRequestInProgressRef.current = true;
            
            startTransition(async () => {
              sessionStorage.setItem(requestKey, 'true');
              const response = await fetch(`/api/tutoring-sessions?message_id=${messageId}`, {
                credentials: 'include'
              });
              
              // No need to process the response - realtime will update the UI
              setIsLoading(false);
              apiRequestInProgressRef.current = false;
            });
          }
        } catch (error) {
          setIsLoading(false);
          apiRequestInProgressRef.current = false;
        }
      };
      
      checkForSession();
    } else {
      // We already have a session ID or don't need one
      setIsLoading(false);
    }
    
    // Cleanup function
    return () => {
      setIsLoading(false);
      apiRequestInProgressRef.current = false;
    };
  }, [messageId, conversationId, sessionId, messageContent, title, scheduledFor, pendingSession, sessions]);

  // Try to determine the creator based on the session request object directly
  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === 'undefined') return;
    
    // If we already have a session request object from props, use it to determine creator
    if (messageContent?.trim().startsWith('Session Request:') && isCreatedByTutor === null) {
      // Session requests are typically created by tutors
      setIsCreatedByTutor(true);
    }
  }, [messageContent, isCreatedByTutor]);

  // Handle accepting a session
  const handleAcceptSession = async () => {
    if (!conversationId || !user || isButtonDisabled) return;
    
    // Either sessionId or messageId must be present
    if (!sessionId && !messageId) {
      toast({
        title: "Error",
        description: "Missing session information. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if this is a temporary conversation ID first
    const isTempConversation = conversationId.startsWith('temp-');
    if (isTempConversation) {
      toast({
        title: "Action Required",
        description: "Please send a message first to create a real conversation before managing sessions.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setIsButtonDisabled(true);

    // Use transitions for smoother UI updates
    startTransition(async () => {
      // Get CSRF token for API requests - force fetch a fresh token
      let csrfToken: string | null = null;
      try {
        csrfToken = await fetchCsrfToken(true); // Force fetch a new token
        
        if (!csrfToken) {
          throw new Error("Failed to fetch CSRF token");
        }
      } catch (tokenError) {
        toast({
          title: "Security Error",
          description: "Unable to verify your security token. Please refresh the page and try again.",
          variant: "destructive",
        });
        setLoading(false);
        setIsButtonDisabled(false);
        return;
      }
      
      try {
        if (sessionId) {
          // Update existing session to accepted
          const response = await fetch("/api/tutoring-sessions", {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json", 
              [CSRF_HEADER_NAME]: csrfToken
            },
            body: JSON.stringify({
              session_id: sessionId,
              action: "update_status",
              status: "accepted"
            }),
            credentials: 'include'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to accept session");
          }
        } else {
          // Need to fetch conversation first to get participants
          const conversationResponse = await fetch(`/api/conversations?conversation_id=${conversationId}`, {
            headers: {
              [CSRF_HEADER_NAME]: csrfToken
            },
            credentials: 'include'
          });
          
          if (!conversationResponse.ok) {
            throw new Error("Failed to fetch conversation details");
          }
          
          const conversationData = await conversationResponse.json();
          const conversation = conversationData.conversation;
          
          if (!conversation) {
            throw new Error("Conversation not found");
          }
          
          // Find the other participant (not the current user)
          const otherParticipant = conversation.participants.find(
            (p: any) => p.user_id !== user.id
          );
          
          if (!otherParticipant) {
            throw new Error("Could not identify the other participant");
          }
          
          // Determine tutor and student IDs
          const tutorId = user.role === "tutor" ? user.id : otherParticipant.user_id;
          const studentId = user.role === "tutor" ? otherParticipant.user_id : user.id;
          
          // Create the session with accepted status
          const sessionResponse = await fetch("/api/tutoring-sessions", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              [CSRF_HEADER_NAME]: csrfToken
            },
            body: JSON.stringify({
              conversation_id: conversationId,
              message_id: messageId || null,
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
            throw new Error(errorData.error || "Failed to create session");
          }
        }
        
        // Show success toast
        toast({
          title: "Session accepted",
          description: "The tutoring session has been accepted",
        });
        
        // No need to call refreshSessions - the realtime system will update the UI
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to accept the session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsButtonDisabled(false);
      }
    });
  };

  // Handle ready toggle
  const handleReadyToggle = async () => {
    if (!sessionId || !user || isButtonDisabled) return;
    
    setUpdating(true);
    setIsButtonDisabled(true);

    startTransition(async () => {
      // Get CSRF token for API requests - force fetch a fresh token
      let csrfToken: string | null = null;
      try {
        csrfToken = await fetchCsrfToken(true); // Force fetch a new token
        
        if (!csrfToken) {
          throw new Error("Failed to fetch CSRF token");
        }
      } catch (tokenError) {
        toast({
          title: "Security Error",
          description: "Unable to verify your security token. Please refresh the page and try again.",
          variant: "destructive",
        });
        setUpdating(false);
        setIsButtonDisabled(false);
        return;
      }
      
      try {
        // Determine the current ready state based on user role
        const isCurrentlyReady = user.role === "tutor" ? tutorReady : studentReady;
        const newReadyState = !isCurrentlyReady;
        
        // Update session ready status
        const response = await fetch("/api/tutoring-sessions", {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            [CSRF_HEADER_NAME]: csrfToken
          },
          body: JSON.stringify({
            session_id: sessionId,
            action: "set_ready",
            is_ready: newReadyState
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update ready status");
        }
        
        // Show success toast
        toast({
          title: newReadyState ? "You're ready" : "Ready status removed",
          description: newReadyState 
            ? "You've marked yourself as ready for this session" 
            : "You've removed your ready status",
        });
        
        // No need to call refreshSessions - the realtime system will update the UI
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update ready status",
          variant: "destructive",
        });
      } finally {
        setUpdating(false);
        setIsButtonDisabled(false);
      }
    });
  };

  // Handle starting a session
  const handleStartSession = async () => {
    if (!sessionId || !user || isButtonDisabled) return;
    
    // Validate that both users are ready
    if (!(tutorReady && studentReady)) {
      toast({
        title: "Cannot start session",
        description: "Both participants must be ready to start the meeting",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setIsButtonDisabled(true);

    startTransition(async () => {
      // Get CSRF token for API requests - force fetch a fresh token
      let csrfToken: string | null = null;
      try {
        csrfToken = await fetchCsrfToken(true); // Force fetch a new token
        
        if (!csrfToken) {
          throw new Error("Failed to fetch CSRF token");
        }
      } catch (tokenError) {
        toast({
          title: "Security Error",
          description: "Unable to verify your security token. Please refresh the page and try again.",
          variant: "destructive",
        });
        setLoading(false);
        setIsButtonDisabled(false);
        return;
      }
      
      try {
        // Update session status to started
        const response = await fetch("/api/tutoring-sessions", {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            [CSRF_HEADER_NAME]: csrfToken
          },
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
        
        // Show success toast
        toast({
          title: "Meeting started",
          description: "The meeting has been started and is now available to join",
        });

        // Navigate to the meeting page after starting
        if (typeof window !== "undefined") {
          window.location.href = `/meeting/${sessionId}`;
        }
        
        // No need to call refreshSessions - the realtime system will update the UI
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to start the session",
          variant: "destructive",
        });
        setLoading(false);
        setIsButtonDisabled(false);
      }
    });
  };

  // Handle ending a session
  const handleEndSession = async () => {
    if (!sessionId || !user || isButtonDisabled) return;
    
    setLoading(true);
    setIsButtonDisabled(true);

    startTransition(async () => {
      // Get CSRF token for API requests - force fetch a fresh token
      let csrfToken: string | null = null;
      try {
        csrfToken = await fetchCsrfToken(true); // Force fetch a new token
        
        if (!csrfToken) {
          throw new Error("Failed to fetch CSRF token");
        }
      } catch (tokenError) {
        toast({
          title: "Security Error",
          description: "Unable to verify your security token. Please refresh the page and try again.",
          variant: "destructive",
        });
        setLoading(false);
        setIsButtonDisabled(false);
        return;
      }
      
      try {
        // Update session status to ended
        const response = await fetch("/api/tutoring-sessions", {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            [CSRF_HEADER_NAME]: csrfToken
          },
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
        
        // Show success toast
        toast({
          title: "Session ended",
          description: "The tutoring session has ended",
        });
        
        // No need to call refreshSessions - the realtime system will update the UI
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to end the session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsButtonDisabled(false);
      }
    });
  };

  // Handle cancelling a session
  const handleCancelSession = async () => {
    if (!conversationId || (!messageId && !sessionId) || !user || isButtonDisabled) return;
    
    // Check if this is a temporary conversation ID first
    const isTempConversation = conversationId.startsWith('temp-');
    if (isTempConversation) {
      toast({
        title: "Action Required",
        description: "Please send a message first to create a real conversation before managing sessions.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setShowCancelDialog(false);
    setIsButtonDisabled(true);

    // Use transitions for smoother UI updates
    startTransition(async () => {
      // Get CSRF token for API requests - force fetch a fresh token
      let csrfToken: string | null = null;
      try {
        csrfToken = await fetchCsrfToken(true); // Force fetch a new token
        
        if (!csrfToken) {
          throw new Error("Failed to fetch CSRF token");
        }
      } catch (tokenError) {
        toast({
          title: "Security Error",
          description: "Unable to verify your security token. Please refresh the page and try again.",
          variant: "destructive",
        });
        setLoading(false);
        setIsButtonDisabled(false);
        return;
      }
      
      try {
        if (sessionId) {
          // Update existing session to cancelled
          const response = await fetch("/api/tutoring-sessions", {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json", 
              [CSRF_HEADER_NAME]: csrfToken
            },
            body: JSON.stringify({
              session_id: sessionId,
              action: "update_status",
              status: "cancelled"
            }),
            credentials: 'include'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to cancel session");
          }
        } else {
          // Create a new session with cancelled status
          const conversationResponse = await fetch(`/api/conversations?conversation_id=${conversationId}`, {
            headers: {
              [CSRF_HEADER_NAME]: csrfToken
            },
            credentials: 'include'
          });
          
          if (!conversationResponse.ok) {
            throw new Error("Failed to fetch conversation details");
          }
          
          const conversationData = await conversationResponse.json();
          const conversation = conversationData.conversation;
          
          if (!conversation) {
            throw new Error("Conversation not found");
          }
          
          // Find the other participant (not the current user)
          const otherParticipant = conversation.participants.find(
            (p: any) => p.user_id !== user.id
          );
          
          if (!otherParticipant) {
            throw new Error("Could not identify the other participant");
          }
          
          // Determine tutor and student IDs
          const tutorId = user.role === "tutor" ? user.id : otherParticipant.user_id;
          const studentId = user.role === "tutor" ? otherParticipant.user_id : user.id;
          
          // Create the session with cancelled status
          const sessionResponse = await fetch("/api/tutoring-sessions", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              [CSRF_HEADER_NAME]: csrfToken
            },
            body: JSON.stringify({
              conversation_id: conversationId,
              message_id: messageId || null,
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
            throw new Error(errorData.error || "Failed to cancel session");
          }
        }
        
        // Show success toast
        toast({
          title: "Session cancelled",
          description: "The tutoring session has been cancelled",
        });
        
        // No need to call refreshSessions - the realtime system will update the UI
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to cancel the session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsButtonDisabled(false);
      }
    });
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

  // Update shouldShowAcceptButton to be more deterministic and avoid hydration mismatches
  const shouldShowAcceptButton = useCallback(() => {
    // Only show accept button for requested sessions
    if (status !== "requested") return false;

    // If we already know whether the creator is a tutor, use that info
    if (isCreatedByTutor !== null) {
      if (isCreatedByTutor) {
        // If tutor created it, student should accept
        return !isTutor;
      } else {
        // If student created it, tutor should accept
        return isTutor;
      }
    }
    
    // For sessions without clear creator info, use this logic:
    // 1. If the current user is a tutor, they shouldn't see the accept button (they created it)
    // 2. If the current user is a student, they should see the accept button
    return !isTutor;
  }, [status, isCreatedByTutor, isTutor]);

  // If we're in a loading state
  if (isLoading) {
    return (
      <Card className="bg-slate-50 border border-slate-200 shadow-sm dark:bg-slate-900/50 dark:border-slate-800">
        <CardContent className="pt-4 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-5 w-5/6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="ml-auto h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
              </div>
              <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2"></div>
              <div className="h-4 w-3/6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2"></div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2 pb-3">
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </CardFooter>
      </Card>
    );
  }

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
                  Cost: {cost ?? '...'} {cost ? (cost === 1 ? 'token' : 'tokens') : ''}
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
  if (!sessionId && (pendingSession || (messageContent && messageContent.trim().startsWith('Session Request:')))) {
    // Either we have an explicit pendingSession or we've detected this is a session request from content
    // Create a placeholder session if needed
    const placeholderSession = pendingSession || {
      title: title || messageContent?.replace(/^Session Request: /, '').trim() || "Tutoring Session",
      scheduledFor: scheduledFor || new Date().toISOString()
    };
    
    // We've detected this is likely a session request message, show placeholder card
    return (
      <Card className="bg-slate-50 border border-slate-200 shadow-sm dark:bg-slate-900/50 dark:border-slate-800">
        <CardContent className="pt-4 pb-2">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-base">{placeholderSession.title}</h3>
                <Badge variant="outline" className="text-blue-600 border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 rounded-full px-4 py-0.5 font-medium">
                  Requested
                </Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1.5 text-muted-foreground/70" />
                <span>{format(parseISO(placeholderSession.scheduledFor), "EEE, MMM d, h:mm a")}</span>
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
                  {shouldShowAcceptButton() ? (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleAcceptSession}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Accept
                    </Button>
                  ) : (
                    <span>{isTutor ? "Waiting for student to accept..." : "Waiting for tutor to accept..."}</span>
                  )}
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
                <>Cost: {cost ?? '...'} {cost ? (cost === 1 ? 'token' : 'tokens') : ''}</>
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
                  disabled={loading || isPending}
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Accept
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={loading || isPending}
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
                    disabled={loading || isPending}
                    onClick={() => setShowCancelDialog(true)}
                    className="flex items-center gap-2 w-fit"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Request
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {isPending ? "Loading..." : (
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
            
            {isTutor && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartSession}
                disabled={loading || !(tutorReady && studentReady)}
                className={tutorReady && studentReady ? "bg-green-600 hover:bg-green-700" : ""}
                title={tutorReady && studentReady ? "Start the meeting" : "Both participants must be ready to start"}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                Start Meeting
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
                <Link href={`/meeting/${sessionId}`}>
                  <Button
                    variant="default"
                    className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Join Meeting
                  </Button>
                </Link>
                
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
                    variant="destructive"
                    onClick={handleEndSession}
                    disabled={loading}
                    className={isInMessagesPage ? "w-full" : ""}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      <>End Session</>
                    )}
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