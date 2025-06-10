"use client";

import { redirect } from "next/navigation";
import Link from "next/link";
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
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SessionLink } from "@/components/SessionLink";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// Import Recharts components
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
    console.log("Today's date:", today.toISOString());
    console.log("Today's date (local):", today.toDateString());
    
    // Create an array for the last 7 days (including today)
    const last7Days: ActivityData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      // Create date for each of the past 7 days
      const date = new Date();
      date.setDate(today.getDate() - i);
      // Reset hours to start of day to avoid time comparison issues
      date.setHours(0, 0, 0, 0);
      
      // Format day name (e.g., "Mon", "Tue")
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Add to our array with 0 sessions initially
      last7Days.push({
        name: dayName,
    sessions: 0,
        sortOrder: 6 - i, // 0 = 6 days ago, 6 = today (reversed to ensure today is the last day)
        date: new Date(date) // Store the full date for comparison
      });
    }
    
    // Log the number of sessions we're processing
    console.log(`Processing ${sessions.length} sessions for activity chart`);
    
    // Log the dates we're checking against
    console.log("Date ranges:", last7Days.map(d => d.date?.toDateString()));
  
    // Process each session to calculate daily activity
  if (sessions && sessions.length > 0) {
      let processedCount = 0;
      let skippedCount = 0;
      
      sessions.forEach((session, index) => {
        try {
          // First check if the session has a valid end date
          if (!session.ended_at) {
            console.log(`Session ${session.id} skipped: Missing ended_at timestamp`);
            skippedCount++;
            return;
          }

          const sessionDate = new Date(session.ended_at);
          console.log(`Session ${index} (${session.id}): ended at ${session.ended_at}, date: ${sessionDate.toDateString()}`);
          
          // Find matching day in our last7Days array
          let matched = false;
          for (let i = 0; i < last7Days.length; i++) {
            const dayData = last7Days[i];
            
            if (!dayData.date) continue;
            
            // Compare the date portion only (ignoring time)
            const sessionDateStr = sessionDate.toDateString();
            const dayDataStr = dayData.date.toDateString();
            
            if (sessionDateStr === dayDataStr) {
              // Increment session count for this day
              dayData.sessions += 1;
              matched = true;
              console.log(`  ✓ Session ${session.id} counted for ${dayData.name} (${dayDataStr})`);
              processedCount++;
              break;
  }
          }
          
          if (!matched) {
            console.log(`  ✗ Session ${session.id} date (${sessionDate.toDateString()}) outside of 7-day window`);
            skippedCount++;
          }
        } catch (err) {
          console.error(`Error processing session ${session.id}:`, err);
          skippedCount++;
        }
      });
      
      console.log(`Activity chart processing complete: ${processedCount} sessions processed, ${skippedCount} skipped`);
    }
    
    // Log the final activity data
    console.log("Weekly activity data:", last7Days.map(d => 
      `${d.name}: ${d.sessions} sessions (${d.date?.toDateString()})`
    ));
    
    // Return in chronological order (oldest to newest)
    return last7Days.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    console.error("Error generating activity data:", error);
    // Return an empty array as fallback
    return [];
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { sessions, refreshSessions, loadingSessions } = useSessions();
  const messageContext = useMessages();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Debug log initial sessions data
  useEffect(() => {
    console.log("Initial sessions data:", sessions ? sessions.length : 0, "sessions");
    if (sessions && sessions.length > 0) {
      console.log("Session statuses:", sessions.map(s => s.status));
    }
  }, []);
  
  // Set initial load complete after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
      // After initial load delay, continue showing loading if sessions are still loading
      setLoadingData(loadingSessions);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [loadingSessions]);
  
  // Update loading state when loadingSessions changes
  useEffect(() => {
    if (!initialLoadComplete) return;
    setLoadingData(loadingSessions);
  }, [loadingSessions, initialLoadComplete]);
  
  // Derived state
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  
  // If user isn't logged in, redirect to home
  if (!user) {
    redirect("/");
  }

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
    
    console.log("All sessions:", sessions.map(s => ({
      id: s.id,
      status: s.status,
      started_at: s.started_at,
      ended_at: s.ended_at
    })));
    
    // Filter for any sessions that have an ended_at timestamp
    // We don't strictly require status='ended' as there might be data inconsistencies
    const filtered = sessions.filter(session => session.ended_at !== null && session.ended_at !== undefined);
    
    console.log("Filtered sessions with ended_at:", filtered.length);
    if (filtered.length > 0) {
      console.log("Sessions with ended_at:", filtered.map(s => ({
        id: s.id,
        status: s.status,
        ended_at: s.ended_at,
        ended_date: new Date(s.ended_at || '').toDateString()
      })));
    }
    
    return filtered;
  }, [sessions]);
  
  // Fetch sessions data
  useEffect(() => {
    console.log("Refreshing sessions data...");
    refreshSessions()
      .then(() => {
        console.log("Sessions refreshed successfully");
        console.log("Sessions after refresh:", sessions ? sessions.length : 0);
        if (sessions && sessions.length > 0) {
          console.log("Session statuses after refresh:", sessions.map(s => ({ 
            id: s.id,
            status: s.status,
            ended_at: s.ended_at ? 'yes' : 'no'
          })));
        }
      })
      .catch(err => console.error("Error refreshing sessions:", err));
  }, [refreshSessions]);
  
  // Calculate total tutoring hours from session history - only from ended sessions
  useEffect(() => {
    if (completedSessions && completedSessions.length > 0) {
      const hours = completedSessions.reduce((total, session) => {
        // Calculate duration if start and end times exist
        if (session.started_at && session.ended_at && session.status === 'ended') {
          const start = new Date(session.started_at);
          const end = new Date(session.ended_at);
          const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + durationHours;
        }
        return total; // Skip sessions without proper timing information
      }, 0);
      
      setTotalHours(parseFloat(hours.toFixed(1)));
    }
  }, [completedSessions]);
    
  // Generate activity data from completed sessions only
  useEffect(() => {
    console.log("Generating weekly activity data from completed sessions:", completedSessions.length);
    if (completedSessions.length > 0) {
      // Debug output for each completed session
      completedSessions.forEach((session, index) => {
        try {
          const endedAt = session.ended_at ? new Date(session.ended_at).toISOString() : 'missing';
          const dayStr = session.ended_at ? new Date(session.ended_at).toDateString() : 'missing';
          console.log(`Completed session ${index}: ID=${session.id}, ended_at=${endedAt}, day=${dayStr}`);
        } catch (err) {
          console.error(`Error processing session ${session.id} for debugging:`, err);
        }
      });
    }
    // Generate chart data from these sessions
    setActivityData(generateActivityData(completedSessions));
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

  // Show loading skeleton during initial load
  if ((loadingData || !initialLoadComplete) && (!sessions || sessions.length === 0)) {
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
              Schedule
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
              Available Tokens
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Your current balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{user?.tokens || 0}</div>
            <p className="text-sm mt-2 text-primary-foreground/80">
              {isStudent 
                ? "Tokens are used to book tutoring sessions"
                : "Earn tokens when students book your sessions"}
            </p>
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
                Last 7 Days
              </Badge>
            </div>
            <CardDescription>
              Your session activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={activityData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                  <XAxis 
                    dataKey="name"
                    tickFormatter={(value, index) => {
                      const item = activityData[index];
                      return item ? item.name : value;
                    }}
                    axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.4 }}
                    tick={{ fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.4 }}
                    tick={{ fill: 'var(--muted-foreground)' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} sessions`, 'Sessions']}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const item = activityData.find(d => d.name === label);
                        if (item && item.date) {
                          return `${label} (${item.date.toLocaleDateString()})`;
                        }
                      }
                      return label;
                    }}
                  />
                  <Bar 
                    dataKey="sessions" 
                    fill="url(#barGradient)" 
                    radius={[4, 4, 0, 0]} 
                    opacity={0.9}
                    animationDuration={1500}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
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
    </div>
  );
} 