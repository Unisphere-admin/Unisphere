"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { useRealtime } from "@/context/RealtimeContext";
import {
  BookOpen,
  ChevronLeft,
  Send,
  UserCheck,
  Video,
  Clock,
  X,
  PhoneCall,
  Star,
  CheckCircle,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Menu,
  Settings,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea as ReviewTextarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ReviewLink } from "@/components/ReviewLink";
import ProtectedPageWrapper from "@/components/layout/ProtectedPageWrapper";

// Define a type for session messages
interface SessionMessage {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
}

interface SessionData {
  id: string;
  created_at: string;
  updated_at: string;
  conversation_id: string;
  message_id: string;
  tutor_id: string;
  student_id: string;
  status: "requested" | "accepted" | "started" | "ended" | "cancelled";
  tutor_ready: boolean;
  student_ready: boolean;
  started_at: string | null;
  ended_at: string | null;
  scheduled_for: string | null;
  name: string | null;
  subject?: string | null;
  tutor_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  student_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

// Define otherParticipant type to include avatar_url
type Participant = {
  name: string;
  id: string;
  avatar_url?: string;
  role: string;
};

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;
  const { user } = useAuth();
  const {
    activeSession,
    loading: sessionLoading,
    getSessionById,
    endSession,
    submitReview,
  } = useSessions();
  const { subscribeToConversation } = useRealtime();
  const { toast } = useToast();

  // Session state
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    "loading" | "active" | "waiting" | "ended" | "cancelled" | "error"
  >("loading");
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Update participants state to use the Participant type
  const [participants, setParticipants] = useState<{
    tutor: Participant;
    student: Participant;
  }>({
    tutor: { name: "", id: "", avatar_url: undefined, role: "tutor" },
    student: { name: "", id: "", avatar_url: undefined, role: "student" },
  });

  // Chat state
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session data
  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchSession = async () => {
      try {
        setSessionStatus("loading");
        const fetchedSession = await getSessionById(sessionId);

        if (!fetchedSession) {
          setSessionStatus("error");
          return;
        }

        // Convert ActiveSession to SessionData
        setSessionData({
          ...fetchedSession,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as SessionData);

        // Map session API status to UI status
        switch (fetchedSession.status) {
          case "started":
            setSessionStatus("active");
            break;
          case "ended":
            setSessionStatus("ended");
            break;
          case "cancelled":
            setSessionStatus("cancelled");
            break;
          case "requested":
          case "accepted":
          default:
            setSessionStatus("waiting");
            break;
        }

        // Get conversation ID from the session
        const conversationId = fetchedSession.conversation_id;

        // Check if user has premium access before subscribing and fetching messages
        // Tutors automatically have access, otherwise check has_access flag
        const isTutor = user?.role === "tutor";
        const hasPremiumAccess = isTutor || user?.has_access;

        if (conversationId) {
          if (hasPremiumAccess) {
            subscribeToConversation(conversationId);

            // Fetch messages in this conversation
            await fetchMessages(conversationId);
          } else {
            // Set empty messages to prevent loading state
            setMessages([]);
          }
        }

        // If session has a start time, calculate elapsed time
        if (fetchedSession.started_at) {
          const startTime = new Date(fetchedSession.started_at).getTime();
          const currentTime = Date.now();
          const elapsed = Math.floor((currentTime - startTime) / 1000);
          setElapsedTime(elapsed > 0 ? elapsed : 0);
        }

        // Start a timer to update elapsed time
        timerRef.current = setInterval(() => {
          setElapsedTime((prev) => prev + 1);
        }, 1000);

        const tutorName = `${
          fetchedSession.tutor_profile?.first_name || "Tutor"
        } ${fetchedSession.tutor_profile?.last_name || ""}`.trim();
        const studentName = `${
          fetchedSession.student_profile?.first_name || "Student"
        } ${fetchedSession.student_profile?.last_name || ""}`.trim();

        setParticipants({
          tutor: {
            name: tutorName,
            id: fetchedSession.tutor_id,
            avatar_url: fetchedSession.tutor_profile?.avatar_url,
            role: "tutor",
          },
          student: {
            name: studentName,
            id: fetchedSession.student_id,
            avatar_url:
              (fetchedSession.student_profile as any)?.avatar_url || undefined,
            role: "student",
          },
        });
      } catch (error) {
        setSessionStatus("error");

        toast({
          title: "Error loading session",
          description:
            "There was an error loading the session. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchSession();

    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, user, getSessionById, subscribeToConversation, toast]);

  // Add this effect to keep track of session updates from context
  useEffect(() => {
    // Only run this effect if both activeSession and sessionData exist and have matching IDs
    if (!activeSession || !sessionData || activeSession.id !== sessionData.id) {
      return;
    }

    // Check if there are meaningful changes to avoid infinite loops
    const statusChanged = activeSession.status !== sessionData.status;
    const readyStateChanged =
      activeSession.tutor_ready !== sessionData.tutor_ready ||
      activeSession.student_ready !== sessionData.student_ready;

    // Only proceed if we have actual changes to apply
    if (!statusChanged && !readyStateChanged) {
      return;
    }

    // Handle status changes
    if (statusChanged) {
      // Update UI status based on session status
      if (activeSession.status === "started") {
        setSessionStatus("active");
      } else if (activeSession.status === "ended") {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setSessionStatus("ended");
      } else if (activeSession.status === "cancelled") {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setSessionStatus("cancelled");
      } else {
        // requested, accepted, or any other state
        setSessionStatus("waiting");
      }
    }

    // Create a new sessionData object with only the fields that changed
    const updatedData = {
      ...sessionData,
      status: activeSession.status,
      tutor_ready: activeSession.tutor_ready,
      student_ready: activeSession.student_ready,
      updated_at: new Date().toISOString(),
    };

    // Update the state
    setSessionData(updatedData);

    // Log the update
    if (statusChanged) {
    } else if (readyStateChanged) {
    }
  }, [activeSession]);

  // Fetch messages for the session
  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/messages?conversation_id=${conversationId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();

      if (data.messages) {
        // Make sure we have properly formatted message objects
        const formattedMessages: SessionMessage[] = data.messages.map(
          (msg: any) => ({
            id: msg.id || `temp-${Date.now()}`,
            sender_id: msg.sender_id || "",
            conversation_id: msg.conversation_id || conversationId,
            content: msg.content || "",
            created_at: msg.created_at || new Date().toISOString(),
            // Only include sender if it exists
            ...(msg.sender ? { sender: msg.sender } : {}),
          })
        );

        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      toast({
        title: "Error loading messages",
        description: "Could not load chat messages for this session.",
        variant: "destructive",
      });
      // Set empty array on error to prevent rendering issues
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !sessionData) return;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: sessionData.conversation_id,
          content: messageText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const newMessage = await response.json();

      // Make sure we're adding a properly formatted message object
      // This prevents directly rendering an API response object
      const formattedMessage: SessionMessage = {
        id: newMessage.id || `temp-${Date.now()}`,
        sender_id: user?.id || "",
        conversation_id: sessionData.conversation_id,
        content: newMessage.content || messageText,
        created_at: newMessage.created_at || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, formattedMessage]);
      setMessageText("");

      // Scroll to bottom
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Your message could not be sent. Please try again.",
        variant: "destructive",
      });
    }
  };

  // End the session
  const handleEndSession = async () => {
    if (!sessionData) return;

    // Client-side role check for extra security
    if (user?.role !== "tutor") {
      toast({
        title: "Permission Denied",
        description: "Only tutors are permitted to end sessions.",
        variant: "destructive",
      });
      return;
    }

    try {
      await endSession(sessionData.id);

      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setSessionStatus("ended");

      toast({
        title: "Session ended",
        description: "The tutoring session has been successfully ended.",
      });

      // Open review dialog
      setIsReviewOpen(true);
    } catch (error) {
      toast({
        title: "Error ending session",
        description: "There was an error ending the session. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Submit review
  const handleSubmitReview = async () => {
    if (!sessionData || rating === 0) {
      toast({
        title: "Please add a rating",
        description:
          "You need to select a rating before submitting your review.",
      });
      return;
    }

    try {
      setIsSubmittingReview(true);

      await submitReview(
        sessionData.id,
        sessionData.tutor_id,
        rating,
        reviewComment
      );

      setIsReviewOpen(false);

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });

      // Navigate back to messages
      router.push("/dashboard/messages");
    } catch (error) {
      toast({
        title: "Error submitting review",
        description:
          "There was an error submitting your review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Cancel the session
  const handleCancelSession = async () => {
    if (!sessionData) return;

    setIsCancelling(true);
    try {
      // Step 1: Cancel the session
      const response = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.id,
          action: "update_status",
          status: "cancelled",
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel session");
      }

      // Session update will be handled through realtime

      // Step 2: Delete the associated message
      if (sessionData.message_id) {
        try {
          const deleteResponse = await fetch(
            `/api/messages?id=${sessionData.message_id}`,
            {
              method: "DELETE",
              credentials: "include",
            }
          );

          if (deleteResponse.ok) {
          } else {
          }
        } catch (messageError) {
          // Don't fail the entire operation if message deletion fails
        }
      }

      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setSessionStatus("cancelled");
      setIsCancelDialogOpen(false);

      toast({
        title: "Session cancelled",
        description: "The tutoring session has been successfully cancelled.",
      });

      // Optional: Navigate back to messages after a delay
      setTimeout(() => {
        router.push("/dashboard/messages");
      }, 3000);
    } catch (error) {
      toast({
        title: "Error cancelling session",
        description:
          "There was an error cancelling the session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Add the toggleVideoCall function back
  const toggleVideoCall = () => {
    // Open meeting in a new tab
    window.open(`/meeting/${sessionId}`, "_blank");
  };

  // Show loading state
  if (sessionLoading || sessionStatus === "loading") {
    return (
      <ProtectedPageWrapper>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-medium">Loading session...</h3>
            <p className="text-muted-foreground mt-2">
              Please wait while we set up your tutoring session
            </p>
          </div>
        </div>
      </ProtectedPageWrapper>
    );
  }

  // Show error state
  if (sessionStatus === "error" || !sessionData) {
    return (
      <ProtectedPageWrapper>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <X className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-medium">Session not found</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              The session you are looking for doesn't exist or has ended
            </p>
            <Button onClick={() => router.push("/dashboard/messages")}>
              Return to Messages
            </Button>
          </div>
        </div>
      </ProtectedPageWrapper>
    );
  }

  // Show cancelled state
  if (sessionStatus === "cancelled") {
    return (
      <ProtectedPageWrapper>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium">Session Cancelled</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              This tutoring session has been cancelled
            </p>
            <Button onClick={() => router.push("/dashboard/messages")}>
              Return to Messages
            </Button>
          </div>
        </div>
      </ProtectedPageWrapper>
    );
  }

  // Get other participant (tutor or student)
  const otherParticipant =
    user?.role === "tutor" ? participants.student : participants.tutor;

  // Determine if current user is ready
  const isCurrentUserReady =
    user?.role === "tutor"
      ? sessionData.tutor_ready
      : sessionData.student_ready;
  const isOtherUserReady =
    user?.role === "tutor"
      ? sessionData.student_ready
      : sessionData.tutor_ready;

  // Main session UI
  return (
    <ProtectedPageWrapper>
      <div className="container mx-auto py-4 px-4 md:px-6 lg:px-8 max-w-7xl">
        {/* Back button and header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {sessionData?.name || "Tutoring Session"}
          </h1>
        </div>

        {/* Session status and controls */}
        <div className="mb-6">
          <Card className="p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={
                      (sessionStatus as string) === "active"
                        ? "default"
                        : (sessionStatus as string) === "ended"
                        ? "outline"
                        : (sessionStatus as string) === "cancelled"
                        ? "destructive"
                        : (sessionStatus as string) === "error"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {(sessionStatus as string) === "active" && "In Progress"}
                    {(sessionStatus as string) === "waiting" && "Scheduled"}
                    {(sessionStatus as string) === "ended" && "Completed"}
                    {(sessionStatus as string) === "cancelled" && "Cancelled"}
                    {(sessionStatus as string) === "loading" && "Loading..."}
                    {(sessionStatus as string) === "error" && "Error"}
                  </Badge>
                  {(sessionStatus as string) === "active" && (
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatElapsedTime(elapsedTime)}
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-medium">
                  {sessionData?.subject || "General Tutoring"}
                </h2>
              </div>

              <div className="flex gap-2">
                {(sessionStatus as string) === "active" && (
                  <AlertDialog
                    open={isCancelDialogOpen}
                    onOpenChange={setIsCancelDialogOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <X className="h-4 w-4 mr-2" />
                        End Session
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          End this tutoring session?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the session as completed. You won't be
                          able to continue the session after ending it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleEndSession}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Ending...
                            </>
                          ) : (
                            <>End Session</>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Main content area - split between video call and chat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Video call section */}
          <div className="md:col-span-2 h-[60vh] bg-gray-900 rounded-lg overflow-hidden">
            {/* AgoraProvider is removed as per the instructions */}
          </div>

          {/* Chat section */}
          <div className="md:col-span-1 bg-white dark:bg-gray-800 border rounded-lg flex flex-col h-[60vh]">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Session Chat</h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.sender_id === user?.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700"
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {message.sender_id === user?.id
                            ? "You"
                            : message.sender?.display_name || "Other"}
                        </p>
                        <p>{message.content}</p>
                        <p className="text-xs opacity-70 text-right mt-1">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 min-h-[60px] max-h-[120px]"
                  disabled={sessionStatus !== "active" || loading}
                />
                <Button
                  type="submit"
                  disabled={
                    !messageText.trim() || sessionStatus !== "active" || loading
                  }
                  className="self-end"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Review dialog */}
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave a Review</DialogTitle>
              <DialogDescription>
                Share your feedback about this tutoring session.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-2xl focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment (Optional)</Label>
                <ReviewTextarea
                  id="comment"
                  placeholder="Share your experience with this tutor..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={rating === 0 || isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>Submit Review</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add the Join Meeting button in the participants section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Participants</h2>
          {sessionStatus === "active" && (
            <Button
              onClick={toggleVideoCall}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            >
              <Video className="h-4 w-4 mr-1" />
              Join Meeting
            </Button>
          )}
        </div>
      </div>
    </ProtectedPageWrapper>
  );
}
