"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessions, loadingSessions } = useSessions();

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loadingSessions) {
      router.push("/login");
    }
  }, [user, router, loadingSessions]);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(today);

  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Schedule</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Upcoming Sessions</CardTitle>
          <CardDescription>Manage your scheduled tutoring sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-3">No upcoming sessions</h3>
              <p className="text-muted-foreground mb-6">You don't have any tutoring sessions scheduled</p>
              <Button asChild>
                <Link href="/tutors">Find a Tutor</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Mathematics Session</h2>
                    <p>1 hour session with Sarah Johnson</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Today, 3:00 PM</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Reschedule</Button>
                  <Button>Join Session</Button>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Physics Homework Help</h2>
                    <p>45 minute session with Michael Chen</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Tomorrow, 4:30 PM</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Reschedule</Button>
                  <Button>Join Session</Button>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Spanish Conversation Practice</h2>
                    <p>1 hour session with Emma Wilson</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Friday, 2:00 PM</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Reschedule</Button>
                  <Button>Join Session</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 