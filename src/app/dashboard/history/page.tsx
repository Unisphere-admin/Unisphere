"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { Loader2, Clock, CalendarCheck } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewLink } from "@/components/ReviewLink";

export default function SessionHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessions, loadingSessions, reviewHistory } = useSessions();

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loadingSessions) {
      router.push("/login");
    }
  }, [user, router, loadingSessions]);

  // Function to render star ratings
  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <span key={i} className={i < rating ? "text-amber-500" : "text-gray-300"}>
          ★
        </span>
      ));
  };

  // Format session date for display
  const formatSessionDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Date not available";
    try {
      const date = parseISO(dateStr);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Get time ago string
  const getTimeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    try {
      const date = parseISO(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "";
    }
  };

  // Only show loading spinner when there are no sessions available yet
  if (loadingSessions && (!sessions || sessions.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter for completed/ended sessions
  const completedSessions = sessions.filter(
    session => session.status === "ended"
  );

  // Find reviews for completed sessions
  const getReviewForSession = (sessionId: string) => {
    return reviewHistory.find(review => review.sessionId === sessionId);
  };

  return (
    <div className="space-y-8 relative">
      {/* Add subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none -z-10"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Session History</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarCheck className="mr-2 h-4 w-4" />
          <span>Your completed sessions</span>
        </div>
      </div>
      
      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/40 shadow-md hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <CardTitle>Past Sessions</CardTitle>
          <CardDescription>Review your completed tutoring sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
                <Clock className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-medium mb-3">No completed sessions</h3>
              <p className="text-muted-foreground mb-6">You haven't completed any tutoring sessions yet</p>
              <Button asChild className="shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]">
                <Link href="/dashboard/schedule">View Schedule</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {completedSessions.map((session) => {
                const review = getReviewForSession(session.id);
                return (
                  <div key={session.id} className="border rounded-lg p-4 bg-card/40 backdrop-blur-sm border-border/40 shadow-sm hover:shadow transition-all hover:bg-card/60 group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold">
                            {session.name || session.subject || "Tutoring Session"}
                          </h2>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Completed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user?.role === "student" ? (
                            <>with {session.tutor_profile?.first_name} {session.tutor_profile?.last_name}</>
                          ) : (
                            <>with {session.student_profile?.first_name} {session.student_profile?.last_name}</>
                          )}
                        </p>
                        {session.ended_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed {getTimeAgo(session.ended_at)}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 md:mt-0">
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatSessionDate(session.scheduled_for)}
                        </div>
                        {review && (
                          <div className="flex text-lg text-amber-500">
                            {renderStars(review.rating)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {review && review.comment && (
                      <div className="mt-2 text-sm border-t pt-2 border-border/30">
                        <p className="italic">"{review.comment}"</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {!review && user?.role === "student" && (
                        <ReviewLink 
                          sessionId={session.id}
                          variant="outline"
                          size="sm"
                          className="shadow-sm border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all"
                        />
                      )}
                      <Button size="sm" variant="secondary" asChild className="shadow-sm hover:shadow hover:bg-secondary/80 transition-all">
                        <Link href={`/dashboard/messages?conversation=${session.conversation_id}`}>
                          View Conversation
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 