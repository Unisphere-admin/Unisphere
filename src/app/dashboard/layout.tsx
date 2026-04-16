"use client";

import { ReactNode, Suspense } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { SessionLinkHandler } from "@/components/layout/SessionLinkHandler";
import ProtectedPageWrapper from "@/components/layout/ProtectedPageWrapper";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedPageWrapper>
      <div className="flex min-h-screen bg-gradient-to-b from-muted/80 to-background/95">
        <Suspense fallback={null}>
          <SessionLinkHandler />
        </Suspense>
        <DashboardSidebar />
        <div className="flex-1 overflow-auto bg-muted/30">
          <main className="container mx-auto py-6 px-4 md:px-6 lg:px-8 max-w-7xl">
            {children}
          </main>
        </div>
      </div>
    </ProtectedPageWrapper>
  );
} 