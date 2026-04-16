"use client";

import { redirect } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import Recharts - it is ~300 KB and only needed for the activity chart.
// This keeps it out of the initial JS bundle for the dashboard page.
const DashboardChart = dynamic(() => import("./DashboardChart"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-muted/50 rounded-lg" />,
});
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { useMessages } from "@/context/MessageContext";
import {
  BarChart as BarChartIcon,
  Calendar,
  Clock,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  History,
  ArrowDownLeft,
  ArrowUpLeft,
  CreditCard,
  BookOpen,
  XCircle,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SessionLink } from "@/components/SessionLink";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useEffect, useState, useMemo } from "react";
import { ActiveSession } from "@/context/SessionContext";

interface ActivityData {
  name: string;
  sessions: number;
  sortOrder: number;
  date?: Date;
}

// Generate activity data based on provided sessions
const generateActivityData = (sessions: ActiveSession[]): ActivityData[] => {
  try {
    const today = new Date();
    
    // Create an array for the last 6 months (including current month)
    const last6Months: ActivityData[] = [];
    
    for (let i = 5; i >= 0; i--) {
      // Create date for each of the past 6 months
      const date = new Date();
      date.setMonth(today.getMonth() - i);
      // Reset to first day of month to avoid date comparison issues
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      
      // Format month name (e.g., "Jan", "Feb")
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Add to our array with 0 sessions initially
      last6Months.push({
        name: monthName,
        sessions: 0,
        sortOrder: 5 - i, // 0 = 5 months ago, 5 = current month (reversed to ensure current month is the last one)
        date: new Date(date) // Store the full date for comparison
      });
    }
    
    // Process each session to calculate monthly activity
    if (sessions && sessions.length > 0) {
      let processedCount = 0;
      let skippedCount = 0;
      
      sessions.forEach((session, index) => {
        try {
          // First check if the session has a valid end date
          if (!session.ended_at) {
            skippedCount++;
            return;
          }

          const sessionDate = new Date(session.ended_at);
          
          // Find matching month in our last6Months array
          let matched = false;
          for (let i = 0; i < last6Months.length; i++) {
            const monthData = last6Months[i];
            
            if (!monthData.date) continue;
            
            // Compare the month and year
            if (sessionDate.getMonth() === monthData.date.getMonth() && 
                sessionDate.getFullYear() === monthData.date.getFullYear()) {
              // Increment session count for this month
              monthData.sessions += 1;
              matched = true;
              processedCount++;
              break;
            }
          }
          
          if (!matched) {
            skippedCount++;
          }
        } catch (err) {
          skippedCount++;
        }
      });
    }
    
    // Return in chronological order (oldest to newest)
    return last6Months.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    // Return an empty array as fallback
    return [];
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { sessions, refreshSessions, loadingSessions } = useSessions();
  const messageContext = useMessages();
  const [initialLoading, setInitialLoading] = useState(true);
  const [creditHistoryOpen, setCreditHistoryOpen] = useState(false);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [creditHistoryLoading, setCreditHistoryLoading] = useState(false);
  
  // If user isn't logged in, redirect to home
  if (!user) {
    redirect("/");
  }

  // Credit history fetch
  const fetchCreditHistory = async () => {
    setCreditHistoryLoading(true);
    try {
      const res = await fetch("/api/credits/history");
      if (res.ok) {
        const data = await res.json();
        setCreditHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch credit history:", err);
    } finally {
      setCreditHistoryLoading(false);
    }
  };

  const openCreditHistory = () => {
    setCreditHistoryOpen(true);
    fetchCreditHistory();
  };

  // User role
  const isStudent = user?.role === "student";
  
  // Filter sessions for upcoming and historical sessions
  const upcomingSessions = useMemo(() => {
    if (!sessions) return [];
    
    const now = new Date();
    
    // Filter for sessions that are scheduled in the future, have status 'accepted', and ordered by date
    return sessions
      .filter(session => 
        session.scheduled_for && 
        new Date(session.scheduled_for) > now && 
        session.status === 'accepted'  // Only show accepted sessions
      )
      .sort((a, b) => {
        if (!a.scheduled_for || !b.scheduled_for) return 0;
        return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
      });
  }, [sessions]);
  
  const completedSessions = useMemo(() => {
    if (!sessions) return [];
    
    // Filter for any sessions that have an ended_at timestamp
    // We don't strictly require status='ended' as there might be data inconsistencies
    const filtered = sessions.filter(session => session.ended_at !== null && session.ended_at !== undefined);
    
    return filtered;
  }, [sessions]);
  
  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await refreshSessions();
      } finally {
        // Set initial loading to false after first data fetch completes
        setInitialLoading(false);
      }
    };
    
    fetchInitialData();
    
    // Set up refresh interval (optional)
    const intervalId = setInterval(() => {
      // Silently refresh data in the background
      refreshSessions().catch(() => {
        // Silent error handling for background refresh
      });
    }, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, [refreshSessions]);
  
  // Memoize total hours -- only recalculates when completedSessions changes
  const totalHours = useMemo(() => {
    if (!completedSessions || completedSessions.length === 0) return 0;
    const hours = completedSessions.reduce((total, session) => {
      if (session.started_at && session.ended_at && session.status === 'ended') {
        const start = new Date(session.started_at);
        const end = new Date(session.ended_at);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + durationHours;
      }
      return total;
    }, 0);
    return parseFloat(hours.toFixed(1));
  }, [completedSessions]);

  // Memoize activity chart data -- only recalculates when completedSessions changes
  const activityData = useMemo(() => {
    return generateActivityData(completedSessions);
  }, [completedSessions]);

  // Get next session time
  const getNextSessionTime = () => {
    if (!upcomingSessions || upcomingSessions.length === 0) {
      return "No upcoming sessions";
    }
    
    const nextSession = upcomingSessions[0];
    if (nextSession.scheduled_for) {
      const date = new Date(nextSession.scheduled_for);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      let dayText = "";
      if (date.toDateString() === today.toDateString()) {
        dayText = "Today";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        dayText = "Tomorrow";
      } else {
        dayText = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      }
      
      const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${dayText} at ${timeText}`;
    }
    
    return "Scheduled";
  };

  // Show loading skeleton only during initial load
  if (initialLoading) {
    return (
      <div className="space-y-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none -z-10"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-1">
              {user?.name ? user.name.split(' ')[0] : 'User'}, here's an overview of your learning journey
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats loading skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
        </div>
        
        {/* Activity chart skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
        
        {/* Sessions skeleton */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Sessions
          </h2>
          <div className="space-y-3 mt-3">
            <Skeleton className="h-[80px] w-full rounded-lg" />
            <Skeleton className="h-[80px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none -z-10"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-1">
            {user?.name ? user.name.split(' ')[0] : 'User'}, here's an overview of your learning journey
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="shadow-sm border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all" size="sm" asChild>
            <Link href="/dashboard/schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Upcoming
            </Link>
          </Button>
          <Button className="shadow-md hover:shadow-lg transition-all bg-primary hover:bg-primary/90" size="sm" asChild>
            <Link href="/dashboard/messages">
              <ArrowRight className="h-4 w-4 mr-2" />
              Messages
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg border-primary/20 hover:shadow-xl transition-all hover:translate-y-[-2px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" strokeWidth={1.5} />
              Available Credits
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Your current balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{user?.tokens || 0}</div>
            <p className="text-sm mt-2 text-primary-foreground/80">
              {isStudent
                ? "Credits are used to book tutoring sessions"
                : "Earn Credits when students book your sessions"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={openCreditHistory}
              className="mt-3 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/15 gap-1.5 px-2 h-8 text-xs font-medium"
            >
              <History className="h-3.5 w-3.5" />
              View Credit History
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm shadow-md border-border/40 hover:shadow-xl transition-all hover:translate-y-[-2px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary/80" strokeWidth={1.5} />
              Session Hours
            </CardTitle>
            <CardDescription>
              {isStudent ? "Your learning time" : "Hours tutored"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalHours}</div>
            <p className="text-sm mt-2 text-muted-foreground">
              {isStudent
                ? `${completedSessions.length} completed sessions`
                : `Across ${completedSessions.length} sessions`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm shadow-md border-border/40 hover:shadow-xl transition-all hover:translate-y-[-2px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary/80" strokeWidth={1.5} />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>
              Scheduled for this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{upcomingSessions ? upcomingSessions.length : 0}</div>
            <p className="text-sm mt-2 text-muted-foreground">
              Next session: {getNextSessionTime()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity and Upcoming Sessions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/80 backdrop-blur-sm shadow-md border-border/40 hover:shadow-xl transition-all">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5 text-primary/80" strokeWidth={1.5} />
              Completed Sessions
            </CardTitle>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Last 6 Months
              </Badge>
            </div>
            <CardDescription>
              Your monthly session activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {activityData.length > 0 ? (
                <DashboardChart activityData={activityData} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <BarChartIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.5} />
                    <h3 className="text-lg font-medium mb-1">No session data</h3>
                    <p className="text-muted-foreground text-sm max-w-[240px]">
                      Complete your first tutoring session to see monthly activity data
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm shadow-md border-border/40 hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary/80" strokeWidth={1.5} />
                Upcoming Sessions
              </CardTitle>
              <CardDescription>Your scheduled learning sessions</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="ml-auto shadow-sm border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all">
              <Link href="/dashboard/schedule" className="flex items-center gap-1">
                View All
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingSessions && upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {upcomingSessions.slice(0, 3).map((session, index) => (
                  <div key={session.id || index} className="bg-card/40 backdrop-blur-sm p-4 rounded-lg border border-border/40 shadow-sm hover:shadow transition-all hover:bg-card/60 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border/40 shadow-sm group-hover:shadow transition-all">
                          <AvatarImage src={session.tutor_profile?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium">
                            {session.tutor_profile?.first_name?.charAt(0) || 'T'}
                            {session.tutor_profile?.last_name?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {isStudent 
                              ? session.tutor_profile 
                                ? `${session.tutor_profile.first_name || ''} ${session.tutor_profile.last_name || ''}`
                                : "Tutor"
                              : session.student_profile
                                ? `${session.student_profile.first_name || ''} ${session.student_profile.last_name || ''}`
                                : "Student"}
                          </h4>
                          <div className="text-sm text-muted-foreground">{session.name || "General Tutoring"}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                          {session.scheduled_for 
                            ? new Date(session.scheduled_for).toLocaleDateString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })
                            : "Scheduled"}
                      </Badge>
                        </div>
                    <Separator className="my-3 opacity-40" />
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {session.scheduled_for 
                            ? new Date(session.scheduled_for).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                          : "Time TBD"}
                      </div>
                      <div className="flex gap-2">
                      {session.conversation_id && (
                          <Button variant="outline" size="sm" asChild className="h-8 shadow-sm border-border/40 hover:bg-muted hover:border-primary/30 transition-all">
                          <SessionLink 
                            sessionId={session.id}
                            conversationId={session.conversation_id}
                          >
                            Message
                          </SessionLink>
                        </Button>
                      )}
                        <Button size="sm" asChild className="h-8 shadow-sm bg-primary hover:bg-primary/90 transition-all">
                          <Link href="/dashboard/schedule">View Details</Link>
                      </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4 bg-muted/30 rounded-lg border border-border/20">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
                  <Calendar className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium mb-2">No upcoming sessions</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {isStudent 
                    ? "Browse tutors to book your first session and start your learning journey"
                    : "Students will book sessions with you soon. Complete your profile to increase visibility"}
                </p>
                {isStudent && (
                  <Button asChild className="shadow-md hover:shadow-lg bg-primary hover:bg-primary/90 transition-all hover:translate-y-[-2px]">
                    <Link href="/tutors" className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Find a Tutor
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
          {upcomingSessions && upcomingSessions.length > 0 && (
            <CardFooter className="pt-0 pb-4 px-6">
              <Button variant="ghost" size="sm" asChild className="w-full border-t border-border/20 pt-3 text-primary/80 hover:text-primary hover:bg-primary/5 transition-colors">
                <Link href="/dashboard/schedule" className="flex items-center justify-center gap-1">
                  View all scheduled sessions
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Credit History Modal */}
      <Dialog open={creditHistoryOpen} onOpenChange={setCreditHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Credit History
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {creditHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
              </div>
            ) : creditHistory.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No credit history yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Transactions will appear here once you start using credits</p>
              </div>
            ) : (
              <div className="space-y-1">
                {creditHistory.map((item: any) => {
                  const isPositive = item.type === "transfer_in" || item.type === "lesson_earning";
                  const isDeclined = item.type === "transfer_declined";
                  const date = new Date(item.date);
                  const formattedDate = date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = date.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const iconMap: Record<string, React.ReactNode> = {
                    transfer_in: <ArrowDownLeft className="h-4 w-4 text-emerald-500" />,
                    transfer_out: <ArrowUpLeft className="h-4 w-4 text-orange-500" />,
                    transfer_declined: <XCircle className="h-4 w-4 text-red-400" />,
                    lesson_deduction: <BookOpen className="h-4 w-4 text-sky-500" />,
                    lesson_earning: <BookOpen className="h-4 w-4 text-emerald-500" />,
                    top_up: <CreditCard className="h-4 w-4 text-violet-500" />,
                  };

                  const bgMap: Record<string, string> = {
                    transfer_in: "bg-emerald-50",
                    transfer_out: "bg-orange-50",
                    transfer_declined: "bg-red-50",
                    lesson_deduction: "bg-sky-50",
                    lesson_earning: "bg-emerald-50",
                    top_up: "bg-violet-50",
                  };

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${bgMap[item.type] || "bg-muted"}`}>
                        {iconMap[item.type] || <Wallet className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formattedDate} at {formattedTime}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold tabular-nums shrink-0 ${
                        isDeclined ? "text-red-400 line-through" : isPositive ? "text-emerald-600" : "text-foreground"
                      }`}>
                        {isDeclined ? "" : isPositive ? "+" : "-"}{item.amount}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}