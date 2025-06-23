"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";

export default function MeetingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  // Protect this page - redirect to login if not authenticated
  if (!loading && !user) {
    redirect("/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
} 