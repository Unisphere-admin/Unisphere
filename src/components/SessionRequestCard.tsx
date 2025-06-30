"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
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
  const { sessions, refreshSessions } = useSessions();
  const { subscribeToConversation, broadcastSessionUpdate } = useRealtime();
  const { toast } = useToast();
  const { fetchCsrfToken } = useCsrfToken();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [messageCreatorId, setMessageCreatorId] = useState<string | null>(null);
  const [isCreatedByTutor, setIsCreatedByTutor] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSession, setPendingSession] = useState<{title: string, scheduledFor: string} | null>(null);
  const [messageContent, setMessageContent] = useState<string | null>(null);
  
  // Use optimistic state to prevent flashing
  const [displayStatus, setDisplayStatus] = useState(status);
  const [displayTutorReady, setDisplayTutorReady] = useState(tutorReady);
  const [displayStudentReady, setDisplayStudentReady] = useState(studentReady);
  
  const isTutor = user?.role === "tutor";
  const pathname = usePathname();
  
  // Check if we're already in the messages page
  const isInMessagesPage = pathname === '/dashboard/messages';

  // Format the date for display
  const formattedDate = scheduledFor 
    ? format(parseISO(scheduledFor), "EEE, MMM d, h:mm a")
    : "Date not set";
    
  // Load optimistic state from storage if available
  useEffect(() => {
    if (!sessionId || typeof window === 'undefined') {
      // No session ID or not in browser, use props
      setDisplayStatus(status);
      setDisplayTutorReady(tutorReady);
      setDisplayStudentReady(studentReady);
      return;
    }
    
    // Function to load state from storage or props
    const loadState = () => {
      try {
        const storedStateJson = sessionStorage.getItem(`session_state_${sessionId}`);
        if (storedStateJson) {
          const parsedState = JSON.parse(storedStateJson);
          
          // Only use stored state if it's recent (within last 30 seconds)
          const isRecent = Date.now() - parsedState.timestamp < 30000;
          
          if (isRecent) {
            setDisplayStatus(parsedState.status);
            setDisplayTutorReady(parsedState.tutorReady);
            setDisplayStudentReady(parsedState.studentReady);
            return true; // State was loaded from storage
          } else {
            // Clear outdated state
            sessionStorage.removeItem(`session_state_${sessionId}`);
          }
        }
        return false; // No valid state in storage
      } catch (e) {
        // If there's an error, fall back to props
        return false;
      }
    };
    
    // Try to load from storage, fall back to props if not found
    if (!loadState()) {
      setDisplayStatus(status);
      setDisplayTutorReady(tutorReady);
      setDisplayStudentReady(studentReady);
    }
    
    // Listen for storage events to sync state across tabs
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === `session_state_${sessionId}` && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue);
          setDisplayStatus(newState.status);
          setDisplayTutorReady(newState.tutorReady);
          setDisplayStudentReady(newState.studentReady);
        } catch (e) {
          // Ignore parsing errors
        }
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [sessionId, status, tutorReady, studentReady]);
  
  // Update display state when props change significantly - simplified to avoid conflicts
  useEffect(() => {
    // Skip if we don't have a session ID yet
    if (!sessionId) return;
    
    // Check if we have optimistic state in storage
    const storedStateJson = sessionStorage.getItem(`session_state_${sessionId}`);
    const isOptimisticUpdateActive = storedStateJson && 
      Date.now() - JSON.parse(storedStateJson).timestamp < 30000;
    
    // Only update from props if there's no active optimistic update
    // or if the status has changed to a terminal state
    if (!isOptimisticUpdateActive || 
        (status === "ended" || status === "cancelled")) {
      // For significant status changes, always update
      if (status !== displayStatus && 
         (status === "started" || status === "ended" || status === "cancelled")) {
        setDisplayStatus(status);
      }
    }
  }, [status, sessionId, displayStatus]);

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
        // Check if we have optimistic state in storage
        const storedStateJson = sessionStorage.getItem(`session_state_${sessionId}`);
        let storedState = null;
        let isOptimisticUpdateActive = false;
        
        if (storedStateJson) {
          try {
            storedState = JSON.parse(storedStateJson);
            // Check if stored state is recent (within last 30 seconds)
            isOptimisticUpdateActive = Date.now() - storedState.timestamp < 30000;
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        if (isOptimisticUpdateActive) {
          // We have active optimistic updates, don't override with realtime data
          // This prevents flickering when realtime updates arrive during optimistic updates
          
          // However, if the server state is "ended" or "cancelled", it should override
          // optimistic states since these are terminal states
          if (contextSession.status === "ended" || contextSession.status === "cancelled") {
            // Terminal states from server should override optimistic updates
            sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
              status: contextSession.status,
              tutorReady: contextSession.tutor_ready,
              studentReady: contextSession.student_ready,
              timestamp: Date.now() // Use current timestamp to make it the most recent update
            }));
            
            // Update display state immediately
            setDisplayStatus(contextSession.status);
            setDisplayTutorReady(contextSession.tutor_ready);
            setDisplayStudentReady(contextSession.student_ready);
          }
        } else {
          // No active optimistic update, use the realtime data
          // Store the latest valid state to prevent flashing
          sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
            status: contextSession.status,
            tutorReady: contextSession.tutor_ready,
            studentReady: contextSession.student_ready,
            timestamp: Date.now()
          }));
          
          // Update display state
          setDisplayStatus(contextSession.status);
          setDisplayTutorReady(contextSession.tutor_ready);
          setDisplayStudentReady(contextSession.student_ready);
        }
      }
    }
  }, [sessionId, sessions]);

  // Fetch message details to determine who created it and if it should be a session
  useEffect(() => {
    const fetchMessageDetails = async () => {
      if (!messageId || !conversationId) return;
      
      if (typeof window === 'undefined') {
        // Skip in SSR context
        return;
      }
      
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
        
        // Only fetch message details if we're in the browser
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
            
            // Immediate check - if content starts with "Session Request:", it's likely from a tutor
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
        });
      } catch (error) {
        console.error("Error fetching message details:", error);
        setIsLoading(false);
      }
    };
    
    fetchMessageDetails();
  }, [messageId, conversationId, user?.role, title]);

  // Fetch session if it doesn't exist yet but should
  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === 'undefined') {
      return;
    }
    
    // Always set loading to false when unmounting to prevent UI getting stuck
    return () => {
      setIsLoading(false);
    };
  }, []);

  // Handle session fetch in a separate effect
  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === 'undefined') {
      return;
    }
    
    // If we don't have a sessionId but we have messageId and conversationId,
    // we might be in a state where the session was just created
    // but not yet associated with the message in the UI
    if (!sessionId && messageId && conversationId) {
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
          startTransition(async () => {
            sessionStorage.setItem(requestKey, 'true');
            const response = await fetch(`/api/tutoring-sessions?message_id=${messageId}`, {
              credentials: 'include'
            });
            
            // No need to process the response - realtime will update the UI
            setIsLoading(false);
          });
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
  }, [messageId, conversationId, sessionId, messageContent, title, scheduledFor, pendingSession, sessions]);

  // Try to determine the creator based on the session request object directly
  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === 'undefined') {
      return;
    }
    
    // If we already have a session request object from props, use it to determine creator
    if (messageContent?.trim().startsWith('Session Request:') && isCreatedByTutor === null) {
      // Session requests are typically created by tutors
      setIsCreatedByTutor(true);
    }
  }, [messageContent, isCreatedByTutor]);

  // Handle accepting a session
  const handleAcceptSession = async () => {
    if (!conversationId || !user) return;
    
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
    
    // Apply optimistic update if we have a session ID
    if (sessionId) {
      sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
        status: "accepted",
        tutorReady: false,
        studentReady: false,
        timestamp: Date.now()
      }));
      
      // Update local display state
      setDisplayStatus("accepted");
    }

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
        // Revert optimistic update
        if (sessionId) {
          sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
            status: "requested",
            tutorReady: false,
            studentReady: false,
            timestamp: Date.now()
          }));
          setDisplayStatus("requested");
        }
        
        toast({
          title: "Security Error",
          description: "Unable to verify your security token. Please refresh the page and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      try {
        let updatedSessionId = sessionId;
        let sessionData;
        
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
            
            // Enhanced token-related error detection
            const errorMessage = errorData.error || "Failed to accept session";
            if (errorMessage.toLowerCase().includes("token") || 
                errorMessage.toLowerCase().includes("csrf") ||
                errorMessage.toLowerCase().includes("insufficient") ||
                errorMessage.toLowerCase().includes("enough")) {
              toast({
                title: errorMessage.toLowerCase().includes("token") ? "Security Token Error" : "Insufficient Tokens",
                description: errorMessage,
                variant: "destructive",
              });
              
              // Revert optimistic update
              sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
                status: "requested",
                tutorReady: false,
                studentReady: false,
                timestamp: Date.now()
              }));
              setDisplayStatus("requested");
              
              setLoading(false);
              return; // Early return to prevent showing the success toast
            }
            
            throw new Error(errorMessage);
          }
          
          // Try to get session data from the response
          try {
            const data = await response.json();
            sessionData = data.session;
          } catch (e) {
            // Response might not have JSON or session data
            console.log("No session data in response for accept");
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
            const errorText = await conversationResponse.text();
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
            
            // Enhanced token-related error detection
            const errorMessage = errorData.error || "Failed to create session";
            if (errorMessage.toLowerCase().includes("token") || 
                errorMessage.toLowerCase().includes("csrf") ||
                errorMessage.toLowerCase().includes("insufficient") ||
                errorMessage.toLowerCase().includes("enough")) {
              toast({
                title: errorMessage.toLowerCase().includes("token") ? "Security Token Error" : "Insufficient Tokens",
                description: errorMessage,
                variant: "destructive",
              });
              setLoading(false);
              return; // Early return to prevent showing the success toast
            }
            
            throw new Error(errorMessage);
          }
          
          // Get the new session ID from response if available
          try {
            const responseData = await sessionResponse.json();
            if (responseData.session && responseData.session.id) {
              updatedSessionId = responseData.session.id;
              sessionData = responseData.session;
              
              // Store the optimistic state for the new session
              sessionStorage.setItem(`session_state_${responseData.session.id}`, JSON.stringify({
                status: "accepted",
                tutorReady: false,
                studentReady: false,
                timestamp: Date.now()
              }));
            }
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }
        
        // Broadcast the session update if we have the required data
        if (typeof broadcastSessionUpdate === 'function' && updatedSessionId) {
          // Find the most complete session data to broadcast
          const sessionToUse = sessionData || sessions?.find(s => s.id === updatedSessionId);
          
          // Create a session object with the minimum required fields
          const broadcastSession = {
            id: updatedSessionId,
            status: "accepted", // Always use accepted status here
            conversation_id: conversationId,
            tutor_ready: false,
            student_ready: false,
            tutor_id: sessionToUse?.tutor_id || '',
            student_id: sessionToUse?.student_id || '',
            created_at: sessionToUse?.created_at || new Date().toISOString()
          };
          
          // Broadcast the session update to all clients
          broadcastSessionUpdate(broadcastSession);
        }
        
        // Show success toast
        toast({
          title: "Session accepted",
          description: "The tutoring session has been accepted",
        });
      } catch (error) {
        // Revert optimistic update if we have a session ID
        if (sessionId) {
          sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
            status: "requested",
            tutorReady: false,
            studentReady: false,
            timestamp: Date.now()
          }));
          setDisplayStatus("requested");
        }
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to accept the session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle ready toggle with optimistic updates
  const handleReadyToggle = async () => {
    if (!sessionId || !user) return;
    
    setUpdating(true);
    
    // Determine the current ready state based on user role
    const isCurrentlyReady = user.role === "tutor" ? tutorReady : studentReady;
    const newReadyState = !isCurrentlyReady;
    
    // Apply optimistic update
    if (user.role === "tutor") {
      // Store optimistic state
      sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
        status: status,
        tutorReady: newReadyState,
        studentReady: studentReady,
        timestamp: Date.now()
      }));
    } else {
      // Store optimistic state
      sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
        status: status,
        tutorReady: tutorReady,
        studentReady: newReadyState,
        timestamp: Date.now()
      }));
    }

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
        return;
      }
      
      try {
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
        
        // Try to get session data from the response
        let sessionData;
        try {
          const data = await response.json();
          sessionData = data.session;
        } catch (e) {
          // Response might not have JSON or session data
          console.log("No session data in response, using local data");
        }
        
        // If we have the useRealtime hook, broadcast the session update
        if (typeof broadcastSessionUpdate === 'function') {
          // Find the most complete session data to broadcast
          const sessionToUse = sessionData || sessions?.find(s => s.id === sessionId);
          
          // Create a session object with the minimum required fields
          const broadcastSession = {
            id: sessionId,
            status: sessionToUse?.status || displayStatus,
            conversation_id: conversationId,
            tutor_ready: user.role === "tutor" ? newReadyState : displayTutorReady,
            student_ready: user.role === "student" ? newReadyState : displayStudentReady,
            tutor_id: sessionToUse?.tutor_id || '',
            student_id: sessionToUse?.student_id || '',
            created_at: sessionToUse?.created_at || new Date().toISOString()
          };
          
          // Broadcast the session update to all clients
          broadcastSessionUpdate(broadcastSession);
        }
        
        // Show success toast
        toast({
          title: newReadyState ? "You're ready" : "Ready status removed",
          description: newReadyState 
            ? "You've marked yourself as ready for this session" 
            : "You've removed your ready status",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update ready status",
          variant: "destructive",
        });
      } finally {
        setUpdating(false);
      }
    });
  };

  // Handle starting a session
  const handleStartSession = async () => {
    if (!sessionId || !user) return;
    
    // Validate that both users are ready
    if (!(displayTutorReady && displayStudentReady)) {
      toast({
        title: "Cannot start session",
        description: "Both participants must be ready to start the meeting",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    // Apply optimistic update
    sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
      status: "started",
      tutorReady: displayTutorReady,
      studentReady: displayStudentReady,
      timestamp: Date.now()
    }));
    
    // Update local display state
    setDisplayStatus("started");

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
        
        // Try to get session data from the response
        let sessionData;
        try {
          const data = await response.json();
          sessionData = data.session;
        } catch (e) {
          // Response might not have JSON or session data
          console.log("No session data in response for start session");
        }
        
        // Broadcast the session update if we have the required data
        if (typeof broadcastSessionUpdate === 'function') {
          // Find the most complete session data to broadcast
          const sessionToUse = sessionData || sessions?.find(s => s.id === sessionId);
          
          // Create a session object with the minimum required fields
          const broadcastSession = {
            id: sessionId,
            status: "started", // Always use started status here
            conversation_id: conversationId,
            tutor_ready: displayTutorReady,
            student_ready: displayStudentReady,
            tutor_id: sessionToUse?.tutor_id || '',
            student_id: sessionToUse?.student_id || '',
            created_at: sessionToUse?.created_at || new Date().toISOString()
          };
          
          // Broadcast the session update to all clients
          broadcastSessionUpdate(broadcastSession);
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
      } catch (error) {
        // Revert optimistic update on error
        sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
          status: "accepted",
          tutorReady: displayTutorReady,
          studentReady: displayStudentReady,
          timestamp: Date.now()
        }));
        setDisplayStatus("accepted");
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to start the session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle ending a session
  const handleEndSession = async () => {
    if (!sessionId || !user) return;
    
    setLoading(true);
    
    // Apply optimistic update
    sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
      status: "ended",
      tutorReady: false,
      studentReady: false,
      timestamp: Date.now()
    }));
    
    // Update local display state
    setDisplayStatus("ended");

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
        
        // Try to get session data from the response
        let sessionData;
        try {
          const data = await response.json();
          sessionData = data.session;
        } catch (e) {
          // Response might not have JSON or session data
          console.log("No session data in response for end session");
        }
        
        // Broadcast the session update if we have the required data
        if (typeof broadcastSessionUpdate === 'function') {
          // Find the most complete session data to broadcast
          const sessionToUse = sessionData || sessions?.find(s => s.id === sessionId);
          
          // Create a session object with the minimum required fields
          const broadcastSession = {
            id: sessionId,
            status: "ended", // Always use ended status here
            conversation_id: conversationId,
            tutor_ready: false,
            student_ready: false,
            tutor_id: sessionToUse?.tutor_id || '',
            student_id: sessionToUse?.student_id || '',
            created_at: sessionToUse?.created_at || new Date().toISOString()
          };
          
          // Broadcast the session update to all clients
          broadcastSessionUpdate(broadcastSession);
        }
        
        // Show success toast
        toast({
          title: "Session ended",
          description: "The tutoring session has ended",
        });
      } catch (error) {
        // Revert optimistic update on error
        sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
          status: "started",
          tutorReady: displayTutorReady,
          studentReady: displayStudentReady,
          timestamp: Date.now()
        }));
        setDisplayStatus("started");
        
        toast({
          title: "Error",
          description: "Failed to end the session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle cancelling a session with optimistic updates
  const handleCancelSession = async () => {
    if (!conversationId || (!messageId && !sessionId) || !user) return;
    
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
    
    // Apply optimistic update
    if (sessionId) {
      // Store optimistic state
      sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
        status: "cancelled",
        tutorReady: false,
        studentReady: false,
        timestamp: Date.now()
      }));
      
      // Update local display state
      setDisplayStatus("cancelled");
    }

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
        return;
      }
      
      try {
        let updatedSessionId = sessionId;
        let sessionData;
        
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
            
            // Enhanced token-related error detection
            const errorMessage = errorData.error || "Failed to cancel session";
            if (errorMessage.toLowerCase().includes("token") || 
                errorMessage.toLowerCase().includes("csrf") ||
                errorMessage.toLowerCase().includes("insufficient") ||
                errorMessage.toLowerCase().includes("enough")) {
              toast({
                title: errorMessage.toLowerCase().includes("token") ? "Security Token Error" : "Insufficient Tokens",
                description: errorMessage,
                variant: "destructive",
              });
              setLoading(false);
              return; // Early return to prevent showing the success toast
            }
            
            throw new Error(errorMessage);
          }
          
          // Try to get session data from the response
          try {
            const data = await response.json();
            sessionData = data.session;
          } catch (e) {
            // Response might not have JSON or session data
            console.log("No session data in response for cancel session");
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
            const errorText = await conversationResponse.text();
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
            throw new Error(errorData.error || "Failed to create cancelled session");
          }
          
          // Get the new session ID from response if available
          try {
            const responseData = await sessionResponse.json();
            if (responseData.session && responseData.session.id) {
              updatedSessionId = responseData.session.id;
              sessionData = responseData.session;
            }
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }
        
        // Broadcast the session update if we have the required data
        if (typeof broadcastSessionUpdate === 'function' && updatedSessionId) {
          // Find the most complete session data to broadcast
          const sessionToUse = sessionData || sessions?.find(s => s.id === updatedSessionId);
          
          // Create a session object with the minimum required fields
          const broadcastSession = {
            id: updatedSessionId,
            status: "cancelled", // Always use cancelled status here
            conversation_id: conversationId,
            tutor_ready: false,
            student_ready: false,
            tutor_id: sessionToUse?.tutor_id || '',
            student_id: sessionToUse?.student_id || '',
            created_at: sessionToUse?.created_at || new Date().toISOString()
          };
          
          // Broadcast the session update to all clients
          broadcastSessionUpdate(broadcastSession);
        }
        
        // Show success toast
        toast({
          title: "Session cancelled",
          description: "The tutoring session has been cancelled",
        });
      } catch (error) {
        // Revert optimistic update if we have a session ID
        if (sessionId) {
          // Reset to previous status
          const previousStatus = status || "requested";
          sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
            status: previousStatus,
            tutorReady: tutorReady,
            studentReady: studentReady,
            timestamp: Date.now()
          }));
          setDisplayStatus(previousStatus);
        }
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to cancel the session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (displayStatus) {
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
    if (displayStatus !== "accepted") return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Badge variant={displayTutorReady ? "default" : "outline"} className="text-xs">
            Tutor {displayTutorReady ? "Ready ✓" : "Not Ready"}
          </Badge>
        </span>
        <span className="flex items-center gap-1">
          <Badge variant={displayStudentReady ? "default" : "outline"} className="text-xs">
            Student {displayStudentReady ? "Ready ✓" : "Not Ready"}
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
    if (displayStatus !== "requested") return false;

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
  }, [displayStatus, isCreatedByTutor, isTutor]);

  // Handle new sessions that might be created via realtime updates
  useEffect(() => {
    // Skip if we're in server-side rendering or if we already have a session ID
    if (typeof window === 'undefined' || sessionId) {
      return;
    }
    
    // Only run this for messages that look like session requests
    if (!messageId || !conversationId || !messageContent || 
        !messageContent.trim().startsWith('Session Request:')) {
      return;
    }
    
    // Check if a new session was created for this message
    const checkForNewSession = () => {
      if (sessions && sessions.length > 0) {
        // Look for a session that matches this message
        const matchingSession = sessions.find(s => 
          (s.message_id === messageId) || 
          (s.conversation_id === conversationId && s.message_id)
        );
        
        if (matchingSession) {
          // Found a session for this message, store its state
          sessionStorage.setItem(`session_state_${matchingSession.id}`, JSON.stringify({
            status: matchingSession.status,
            tutorReady: matchingSession.tutor_ready,
            studentReady: matchingSession.student_ready,
            timestamp: Date.now()
          }));
        }
      }
    };
    
    // Check when sessions change
    checkForNewSession();
    
    // Set up a listener for realtime session changes
    const sessionUpdateKey = 'session_update_notification';
    
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === sessionUpdateKey) {
        checkForNewSession();
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [sessionId, messageId, conversationId, messageContent, sessions]);

  // Listen for session update notifications from other components
  useEffect(() => {
    if (typeof window === 'undefined' || !sessionId) return;
    
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'session_update_notification' && event.newValue) {
        try {
          // Parse the notification data
          const notificationData = JSON.parse(event.newValue);
          
          // Check if this notification is for our session
          if (notificationData.sessionId === sessionId) {
            console.log("Received session update notification:", notificationData);
            
            // First check if we have the session data in localStorage
            const sessionDataKey = `session_data_${sessionId}`;
            const sessionDataJson = localStorage.getItem(sessionDataKey);
            
            if (sessionDataJson) {
              // We have direct session data, use it
              const sessionData = JSON.parse(sessionDataJson);
              
              // Check if we need to update our display state
              const storedStateJson = sessionStorage.getItem(`session_state_${sessionId}`);
              let isOptimisticUpdateActive = false;
              
              if (storedStateJson) {
                try {
                  const storedState = JSON.parse(storedStateJson);
                  isOptimisticUpdateActive = Date.now() - storedState.timestamp < 30000;
                  
                  // If our optimistic update is older than the session data, it's outdated
                  if (storedState.timestamp < sessionData.timestamp) {
                    isOptimisticUpdateActive = false;
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
              
              // Only update if we don't have an active optimistic update
              // or if the session status is a terminal state
              // or if this is specifically a ready status change (for other users)
              if (!isOptimisticUpdateActive || 
                  sessionData.status === 'ended' || 
                  sessionData.status === 'cancelled' ||
                  notificationData.type === 'ready_status_change') {
                
                // For ready status changes, we want to update only the ready status
                // without affecting other states if we have an optimistic update active
                if (isOptimisticUpdateActive && notificationData.type === 'ready_status_change') {
                  // Get current state - we already checked storedStateJson is not null above
                  if (storedStateJson) {
                    const currentState = JSON.parse(storedStateJson);
                    
                    // Only update the ready statuses
                    const newState = {
                      ...currentState,
                      tutorReady: sessionData.tutor_ready,
                      studentReady: sessionData.student_ready,
                      timestamp: Date.now() // Use current timestamp to make it the most recent
                    };
                    
                    // Save the updated state
                    sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify(newState));
                    
                    // Update display state for ready status only
                    setDisplayTutorReady(sessionData.tutor_ready);
                    setDisplayStudentReady(sessionData.student_ready);
                  }
                } else {
                  // For other updates or when no optimistic update is active,
                  // update all state properties
                  sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
                    status: sessionData.status,
                    tutorReady: sessionData.tutor_ready,
                    studentReady: sessionData.student_ready,
                    timestamp: Date.now() // Use current timestamp to make it the most recent
                  }));
                  
                  // Update display state
                  setDisplayStatus(sessionData.status);
                  setDisplayTutorReady(sessionData.tutor_ready);
                  setDisplayStudentReady(sessionData.student_ready);
                }
              }
            } else if (sessions) {
              // Fall back to checking the sessions context
              const updatedSession = sessions.find(s => s.id === sessionId);
              if (updatedSession) {
                // Same logic as above, but using sessions context data
                const storedStateJson = sessionStorage.getItem(`session_state_${sessionId}`);
                let isOptimisticUpdateActive = false;
                
                if (storedStateJson) {
                  try {
                    const storedState = JSON.parse(storedStateJson);
                    isOptimisticUpdateActive = Date.now() - storedState.timestamp < 30000;
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }
                
                // Only update if we don't have an active optimistic update
                // or if the session status is a terminal state
                // or if this is specifically a ready status change (for other users)
                if (!isOptimisticUpdateActive || 
                    updatedSession.status === 'ended' || 
                    updatedSession.status === 'cancelled' ||
                    notificationData.type === 'ready_status_change') {
                  
                  // For ready status changes, we want to update only the ready status
                  // without affecting other states if we have an optimistic update active
                  if (isOptimisticUpdateActive && notificationData.type === 'ready_status_change') {
                    // Get current state - we already checked storedStateJson is not null above
                    if (storedStateJson) {
                      const currentState = JSON.parse(storedStateJson);
                      
                      // Only update the ready statuses
                      const newState = {
                        ...currentState,
                        tutorReady: updatedSession.tutor_ready,
                        studentReady: updatedSession.student_ready,
                        timestamp: Date.now() // Use current timestamp to make it the most recent
                      };
                      
                      // Save the updated state
                      sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify(newState));
                      
                      // Update display state for ready status only
                      setDisplayTutorReady(updatedSession.tutor_ready);
                      setDisplayStudentReady(updatedSession.student_ready);
                    }
                  } else {
                    // For other updates or when no optimistic update is active,
                    // update all state properties
                    sessionStorage.setItem(`session_state_${sessionId}`, JSON.stringify({
                      status: updatedSession.status,
                      tutorReady: updatedSession.tutor_ready,
                      studentReady: updatedSession.student_ready,
                      timestamp: Date.now()
                    }));
                    
                    setDisplayStatus(updatedSession.status);
                    setDisplayTutorReady(updatedSession.tutor_ready);
                    setDisplayStudentReady(updatedSession.student_ready);
                  }
                }
              }
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [sessionId, sessions]);

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
  if (displayStatus === "cancelled") {
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
        {displayStatus === "requested" && (
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
        
        {displayStatus === "accepted" && (
          <>
            <Button 
              variant={isTutor ? (displayTutorReady ? "outline" : "default") : (displayStudentReady ? "outline" : "default")}
              size="sm"
              onClick={handleReadyToggle}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isTutor ? (displayTutorReady ? "Not Ready" : "Ready") : (displayStudentReady ? "Not Ready" : "Ready")}
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
                disabled={loading || !(displayTutorReady && displayStudentReady)}
                className={displayTutorReady && displayStudentReady ? "bg-green-600 hover:bg-green-700" : ""}
                title={displayTutorReady && displayStudentReady ? "Start the meeting" : "Both participants must be ready to start"}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                Start Meeting
              </Button>
            )}
          </>
        )}
        
        {displayStatus === "started" && (
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
        
        {displayStatus === "ended" && (
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