"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { useRealtime } from "@/context/RealtimeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Loader2, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  PlayCircle,
  MessageCircle
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
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

// Define a type for the sessions to avoid TypeScript errors
interface SessionType {
  id: string;
  status: string;
  name?: string;
  subject?: string;
  scheduled_for?: string | null;
  updated_at?: string;
  created_at?: string;
  tutor_id?: string;
  student_id?: string;
  tutor_ready?: boolean;
  student_ready?: boolean;
  conversation_id?: string;
  message_id?: string;
  tutor_profile?: { first_name?: string; last_name?: string };
  student_profile?: { first_name?: string; last_name?: string };
  created_by?: string;
  cost?: number | null;
}

export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessions, loadingSessions } = useSessions();
  const { subscribeToConversation, unsubscribeFromConversation } = useRealtime();
  const { toast } = useToast();
  const [cancelingSession, setCancelingSession] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<{ id: string, message_id: string | undefined } | null>(null);
  
  // Action loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Track visible sessions state
  const [visibleSessions, setVisibleSessions] = useState<string[]>([]);
  const previousSessionsRef = useRef<SessionType[]>([]);
  
  // Save scroll position
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef<number>(0);
  
  // Save scroll position
  const saveScrollPosition = () => {
    if (contentRef.current) {
      scrollPosition.current = window.scrollY;
    }
  };
  
  // Restore scroll position after data changes
  useLayoutEffect(() => {
    if (!loadingSessions && scrollPosition.current > 0) {
      window.scrollTo(0, scrollPosition.current);
    }
  }, [sessions, loadingSessions, visibleSessions]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loadingSessions) {
      router.push("/login");
    }
  }, [user, router, loadingSessions]);

  // Add this useEffect for handling session refreshes
  useEffect(() => {
    // Save scroll position before sessions update
    saveScrollPosition();
    
    if (!loadingSessions && sessions && sessions.length > 0) {
      // Keep track of session IDs for maintaining UI state
      const currentSessionIds = sessions.map(session => session.id);
      setVisibleSessions(prev => {
        const existingIds = prev.filter(id => currentSessionIds.includes(id));
        const newIds = currentSessionIds.filter(id => !prev.includes(id));
        return [...existingIds, ...newIds];
      });
      
      // Store previous sessions state for reference
      previousSessionsRef.current = [...sessions];
    }
  }, [sessions, loadingSessions]);

  // Subscribe to realtime updates for all conversation IDs in the sessions
  useEffect(() => {
    if (!sessions || !sessions.length) return;
    
    // Get unique conversation IDs from sessions
    const conversationIds = Array.from(
      new Set(sessions.map(session => session.conversation_id))
    ).filter(Boolean) as string[];
    
    // Subscribe to each conversation
    conversationIds.forEach(conversationId => {
      if (conversationId) subscribeToConversation(conversationId);
    });
    
    // Cleanup subscriptions when component unmounts
    return () => {
      conversationIds.forEach(conversationId => {
        if (conversationId) unsubscribeFromConversation(conversationId);
      });
    };
  }, [sessions, subscribeToConversation, unsubscribeFromConversation]);

  // Add an effect to handle session list updates from SessionContext
  useEffect(() => {
    if (!loadingSessions && sessions) {
      // Transform sessions into a map for faster lookups
      const sessionsMap = new Map(
        sessions.map(session => [session.id, session])
      );
      
      // Update the visible sessions with the full sessions data
      setVisibleSessions(prev => {
        // Keep existing visible sessions in the same order
        const updatedVisible = prev
          .filter(id => sessionsMap.has(id))
          .map(id => sessionsMap.get(id)!.id);
        
        // Add any new sessions that should be visible but aren't yet
        const newSessionIds = sessions
          .filter(session => !prev.includes(session.id) && 
            ['requested', 'accepted', 'started'].includes(session.status?.toLowerCase() || ''))
          .map(session => session.id);
          
        return [...updatedVisible, ...newSessionIds];
      });
      
      // Save current sessions for reference
      previousSessionsRef.current = [...sessions];
    }
  }, [sessions, loadingSessions]);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(today);

  // Format session date for display
  const formatSessionDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Not scheduled";
    
    const date = parseISO(dateStr);
    
    if (isToday(date)) {
      return `Today, ${format(date, "h:mm a")}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, "h:mm a")}`;
    } else {
      return format(date, "EEE, MMM d, h:mm a");
    }
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "started":
        return <Badge className="bg-green-500 hover:bg-green-600">In Progress</Badge>;
      case "accepted":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Upcoming</Badge>;
      case "requested":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Requested</Badge>;
      case "ended":
        return <Badge className="bg-gray-500 hover:bg-gray-600">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500 hover:bg-red-600">Cancelled</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Handle cancelling a session
  const handleCancelSession = async () => {
    if (!sessionToCancel) return;
    
    setCancelingSession(sessionToCancel.id);
    try {
      // Step 1: Cancel the session
      const response = await fetch("/api/tutoring-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionToCancel.id,
          action: "update_status",
          status: "cancelled"
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel session");
      }
      
      toast({
        title: "Session cancelled",
        description: "The tutoring session has been cancelled",
      });
      
      // Session updates will be handled by realtime updates
    } catch (error) {
      console.error("Error cancelling session:", error);
      
      toast({
        title: "Error cancelling session",
        description: error instanceof Error ? error.message : "Failed to cancel session",
        variant: "destructive"
      });
    } finally {
      setCancelingSession(null);
      setSessionToCancel(null);
      setShowCancelDialog(false);
    }
  };
  
  // Handle accepting a session request (for tutors)
  const handleAcceptSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
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
        throw new Error(errorData.error || "Failed to accept session");
      }
      
      toast({
        title: "Session accepted",
        description: "You've successfully accepted the tutoring session",
      });
      
      // Session updates will be handled by realtime updates
    } catch (error) {
      console.error("Error accepting session:", error);
      
      toast({
        title: "Error accepting session",
        description: error instanceof Error ? error.message : "Failed to accept session",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };
  
  // Handle ready status
  const handleReadyToggle = async (sessionId: string, currentStatus: boolean | undefined) => {
    setActionLoading(sessionId);
    try {
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
        throw new Error(errorData.error || "Failed to update status");
      }
      
      toast({
        title: currentStatus ? "No Longer Ready" : "Ready",
        description: currentStatus ? "You've marked yourself as not ready" : "You've marked yourself as ready",
      });
      
      // Session updates will be handled by realtime updates
    } catch (error) {
      console.error("Error updating ready status:", error);
      
      toast({
        title: "Error updating status",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };
  
  // Handle starting a session
  const handleStartSession = async (sessionId: string) => {
    setActionLoading(sessionId);
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
      
      toast({
        title: "Session started",
        description: "Your tutoring session has started successfully",
      });
      
      // Redirect to the session page
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Error starting session:", error);
      
      toast({
        title: "Error starting session",
        description: error instanceof Error ? error.message : "Failed to start session",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle ending a session
  const handleEndSession = async (sessionId: string) => {
    if (!sessionId) return;
    
    // Only tutors can end sessions
    if (user?.role !== 'tutor') {
      toast({
        title: "Permission Denied",
        description: "Only tutors can end active sessions.",
        variant: "destructive",
      });
      return;
    }
    
    setActionLoading(sessionId);
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
      setActionLoading(null);
    }
  };

  // Add this function to check who created the session request and determine who should accept
  const shouldShowAcceptButton = (session: SessionType) => {
    if (!user || !session) return false;
    
    // For sessions that are already accepted, nobody needs to accept
    if (session.status !== 'requested') return false;
    
    if (user.role === 'tutor') {
      // For tutor users:
      // If session was created by the tutor (same user), the student should accept, not the tutor
      return session.tutor_id === user.id && session.created_by !== user.id; 
    } else {
      // For student users:
      // If session was created by the tutor, the student should accept
      return session.student_id === user.id && session.created_by !== user.id;
    }
  };

  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get the sessions that should be displayed
  const upcomingSessions = visibleSessions
    // Map ID to actual session object and cast to SessionType
    .map(id => sessions.find(session => session.id === id) as SessionType | undefined)
    .filter((session): session is SessionType => session !== undefined) // Type guard
    // Make sure we only show upcoming and active sessions
    .filter((session) => {
      const normalizedStatus = session.status?.toLowerCase?.() || '';
      return normalizedStatus === "requested" || 
             normalizedStatus === "accepted" || 
             normalizedStatus === "started";
    })
    .sort((a, b) => {
      // First, sort by status (started > accepted > requested)
      const statusOrder: Record<string, number> = { started: 0, accepted: 1, requested: 2 };
      const statusA = (a.status || '').toLowerCase();
      const statusB = (b.status || '').toLowerCase();
      const statusDiff = (statusOrder[statusA] || 99) - (statusOrder[statusB] || 99);
      if (statusDiff !== 0) return statusDiff;
      
      // For same status, sort by scheduled date (soonest first)
      if (a.scheduled_for && b.scheduled_for) {
        return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
      }
      
      // Use any available timestamp for sorting as fallback
      const timeA = new Date(a.scheduled_for || a.updated_at || a.created_at || Date.now()).getTime();
      const timeB = new Date(b.scheduled_for || b.updated_at || b.created_at || Date.now()).getTime();
      return timeA - timeB;
    });

  const getSessionStatusText = (status: string) => {
    switch(status) {
      case "requested":
        return "Tutoring session requested";
      case "accepted":
        return "Session scheduled";
      case "started":
        return "Session in progress";
      default:
        return "";
    }
  };
  
  // Render ready status indicators
  const renderReadyStatus = (session: SessionType) => {
    if (session.status !== "accepted") return null;
    
    const isTutor = user?.role === "tutor";
    const tutorReadyStatus = session.tutor_ready ? "Ready ✓" : "Not Ready";
    const studentReadyStatus = session.student_ready ? "Ready ✓" : "Not Ready";
    
    return (
      <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
        <Badge variant={session.tutor_ready ? "default" : "outline"} className="text-xs">
          Tutor {tutorReadyStatus}
        </Badge>
        <Badge variant={session.student_ready ? "default" : "outline"} className="text-xs">
          Student {studentReadyStatus}
        </Badge>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-4 px-2" ref={contentRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Upcoming Sessions</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>{formattedDate}</span>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Your Scheduled Sessions</CardTitle>
          <CardDescription>Manage your upcoming tutoring sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-3">No upcoming sessions</h3>
              <p className="text-muted-foreground mb-6">You don't have any tutoring sessions scheduled</p>
              <Button asChild>
                <Link href="/tutors">Find a Tutor</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => {
                const isTutor = user?.role === "tutor";
                const isCurrentUserReady = isTutor ? session.tutor_ready : session.student_ready;
                const isOtherUserReady = isTutor ? session.student_ready : session.tutor_ready;
                const bothReady = session.tutor_ready && session.student_ready;
                
                return (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold">
                            {session.name || session.subject || "Tutoring Session"}
                          </h2>
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user?.role === "student" ? (
                            <>with {session.tutor_profile?.first_name} {session.tutor_profile?.last_name}</>
                          ) : (
                            <>with {session.student_profile?.first_name} {session.student_profile?.last_name}</>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getSessionStatusText(session.status)}
                        </p>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">
                            {loadingSessions ? (
                              "Cost: Loading..."
                            ) : (
                              <>Cost: {session.cost ?? '...'} {session.cost ? (session.cost === 1 ? 'token' : 'tokens') : ''}</>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0 flex items-center text-sm">
                        <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                        <span className="bg-muted px-2.5 py-1 rounded-full">
                          {formatSessionDate(session.scheduled_for)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Ready status indicators for accepted sessions */}
                    {renderReadyStatus(session)}
                    
                    <div className="flex flex-wrap gap-2">
                      {session.status === "started" && (
                        <>
                          {user?.role === 'tutor' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoading === session.id}
                              onClick={() => handleEndSession(session.id)}
                            >
                              {actionLoading === session.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              End Session
                            </Button>
                          )}
                        </>
                      )}
                      
                      {session.status === "accepted" && (
                        <>
                          <Button 
                            variant={isCurrentUserReady ? "outline" : "default"}
                            onClick={() => handleReadyToggle(session.id, !!isCurrentUserReady)}
                            disabled={actionLoading === session.id}
                          >
                            {actionLoading === session.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            {isCurrentUserReady ? "Not Ready" : "Ready"}
                          </Button>
                          
                          {isTutor && bothReady && (
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStartSession(session.id)}
                              disabled={actionLoading === session.id}
                            >
                              {actionLoading === session.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <PlayCircle className="h-4 w-4 mr-2" />
                              )}
                              Start Session
                            </Button>
                          )}
                          
                          <Button variant="outline" asChild>
                            <Link href={`/dashboard/messages?conversationId=${session.conversation_id}`}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Message
                            </Link>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            disabled={cancelingSession === session.id || actionLoading === session.id}
                            onClick={() => {
                              setSessionToCancel({
                                id: session.id,
                                message_id: session.message_id
                              });
                              setShowCancelDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Session
                          </Button>
                        </>
                      )}
                      
                      {session.status === "requested" && (
                        <div className="flex flex-wrap gap-2">
                          {shouldShowAcceptButton(session) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAcceptSession(session.id)}
                              disabled={actionLoading === session.id}
                            >
                              {actionLoading === session.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Accept
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/messages?conversationId=${session.conversation_id}`}>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSessionToCancel({ id: session.id, message_id: session.message_id });
                              setShowCancelDialog(true);
                            }}
                            disabled={actionLoading === session.id || cancelingSession === session.id}
                          >
                            {cancelingSession === session.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Tutoring Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this tutoring session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToCancel(null)}>
              Keep Session
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleCancelSession}
            >
              {cancelingSession ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Session"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 