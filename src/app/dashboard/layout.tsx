"use client";

import { ReactNode } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { useAuth } from "@/context/AuthContext";
import { redirect } from "next/navigation";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Redirect if not authenticated
  if (!user) {
    redirect("/");
  }
  
  return (
    <div className="flex container mx-auto max-w-screen-xl min-h-[calc(100vh-4rem)] pt-16 w-full">
      <DashboardSidebar />
      <div className="flex-1 p-4 md:p-8 w-full">
        {children}
      </div>
    </div>
  );
} 