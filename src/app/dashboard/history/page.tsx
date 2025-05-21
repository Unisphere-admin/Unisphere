"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionContext";
import { Loader2 } from "lucide-react";

export default function SessionHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { reviewHistory, loading } = useSessions();

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loading) {
      router.push("/login");
    }
  }, [user, router, loading]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Session History</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-2">Past Sessions</h2>
          <p className="text-gray-600 mb-6">Review your previous tutoring sessions</p>
          
          {reviewHistory.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-3">No past sessions</h3>
              <p className="text-muted-foreground mb-6">You haven't completed any tutoring sessions yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold">Mathematics - Calculus</h3>
                    <p className="text-gray-600">1 hour session with Sarah Johnson</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="text-gray-500 text-sm">2 days ago</span>
                  </div>
                </div>
                <div className="flex text-xl mt-1">
                  {renderStars(5)}
                </div>
                <p className="mt-2">Excellent session!</p>
              </div>
              
              <div className="bg-white border rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold">English Literature</h3>
                    <p className="text-gray-600">1 hour session with Michael Chen</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="text-gray-500 text-sm">1 week ago</span>
                  </div>
                </div>
                <div className="flex text-xl mt-1">
                  {renderStars(4)}
                </div>
                <p className="mt-2">Very helpful!</p>
              </div>
              
              <div className="bg-white border rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold">French Conversation</h3>
                    <p className="text-gray-600">1 hour session with Emma Wilson</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="text-gray-500 text-sm">2 weeks ago</span>
                  </div>
                </div>
                <div className="flex text-xl mt-1">
                  {renderStars(5)}
                </div>
                <p className="mt-2">Amazing tutor!</p>
              </div>
              
              <div className="bg-white border rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold">Physics - Mechanics</h3>
                    <p className="text-gray-600">1 hour session with Sarah Johnson</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="text-gray-500 text-sm">3 weeks ago</span>
                  </div>
                </div>
                <div className="flex text-xl mt-1">
                  {renderStars(4)}
                </div>
                <p className="mt-2">Good explanation of concepts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 