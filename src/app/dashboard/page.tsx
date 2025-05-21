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
  Users,
  BookOpen,
  Award,
  BookText,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Import Recharts components
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeSession, reviewHistory } = useSessions();
  const { conversations } = useMessages();
  
  // If user isn't logged in, redirect to home
  if (!user) {
    redirect("/");
  }

  const isStudent = user?.role === "student";

  // Mock data for dashboard charts
  const sessionData = [
    { name: "Mon", sessions: 1 },
    { name: "Tue", sessions: 3 },
    { name: "Wed", sessions: 2 },
    { name: "Thu", sessions: 4 },
    { name: "Fri", sessions: 3 },
    { name: "Sat", sessions: 2 },
    { name: "Sun", sessions: 0 },
  ];
  
  const subjectData = [
    { name: "Math", value: 40 },
    { name: "Science", value: 25 },
    { name: "English", value: 15 },
    { name: "History", value: 10 },
    { name: "Other", value: 10 },
  ];
  
  const COLORS = ['#4361EE', '#FF5C8D', '#36B37E', '#FFAB00', '#6554C0'];

  // Count unread messages
  const unreadCount = conversations.reduce(
    (total, conv) => total + conv.unreadCount,
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Welcome, {user?.name}!
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center">
            <Wallet className="h-3.5 w-3.5 mr-1" />
            {user?.tokens} tokens
          </Badge>
          <Button asChild size="sm">
            <Link href="/dashboard/tokens">Buy Tokens</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Available Tokens
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Your current balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{user?.tokens}</div>
            <p className="text-sm mt-2 text-primary-foreground/80">
              {isStudent 
                ? "Tokens are used to book tutoring sessions"
                : "Earn tokens when students book your sessions"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Hours
            </CardTitle>
            <CardDescription>
              {isStudent ? "Your learning time" : "Hours tutored"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
            <p className="text-sm mt-2 text-muted-foreground">
              {isStudent
                ? "Total hours spent learning"
                : "Total hours teaching students"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>
              Scheduled for this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3</div>
            <p className="text-sm mt-2 text-muted-foreground">
              Next session: Today at 3:00 PM
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5 text-muted-foreground" />
              Weekly Activity
            </CardTitle>
            <CardDescription>
              Your sessions over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={sessionData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    formatter={(value) => [`${value} sessions`, 'Sessions']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="sessions" 
                    fill="var(--primary)" 
                    radius={[4, 4, 0, 0]} 
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookText className="h-5 w-5 text-muted-foreground" />
              Subject Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of your learning focus
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={subjectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {subjectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming sessions and quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Upcoming Sessions</CardTitle>
                <CardDescription>Your scheduled learning sessions</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="ml-auto">
                <Link href="/dashboard/schedule">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeSession ? (
                <div className="space-y-4">
                  <div className="bg-muted/40 p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={activeSession.tutor_profile?.avatar_url} />
                          <AvatarFallback>
                            {activeSession.tutor_profile ? 
                              `${activeSession.tutor_profile.first_name.charAt(0)}${activeSession.tutor_profile.last_name.charAt(0)}` : 
                              'TU'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {activeSession.tutor_profile ? 
                              `${activeSession.tutor_profile.first_name} ${activeSession.tutor_profile.last_name}` : 
                              "Tutor"}
                          </h4>
                          <div className="text-sm text-muted-foreground">{activeSession.subject || "General Tutoring"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Today</div>
                        <div className="text-sm text-muted-foreground">
                          {activeSession.scheduled_for ? 
                            new Date(activeSession.scheduled_for).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 
                            "Scheduled"}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/messages">Message</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/session/${activeSession.id}`}>Join Session</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">Jane Doe</h4>
                          <div className="text-sm text-muted-foreground">English Literature</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Tomorrow</div>
                        <div className="text-sm text-muted-foreground">2:00 PM</div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/messages">Message</Link>
                      </Button>
                      <Button size="sm" variant="secondary">Schedule</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <h3 className="text-lg font-medium mb-1">No upcoming sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    Book a session with a tutor to get started
                  </p>
                  <Button asChild>
                    <Link href="/tutors">Find a Tutor</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Navigate to common areas</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/tutors">
                  <Users className="mr-2 h-4 w-4" />
                  Browse Tutors
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/schedule">
                  <Calendar className="mr-2 h-4 w-4" />
                  My Schedule
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/messages">
                  <div className="relative">
                    <BookOpen className="mr-2 h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  Messages
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/history">
                  <BookText className="mr-2 h-4 w-4" />
                  Session History
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/settings">
                  <Award className="mr-2 h-4 w-4" />
                  Achievements
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 