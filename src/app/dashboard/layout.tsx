"use client";

import { ReactNode } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { SessionLinkHandler } from "@/components/layout/SessionLinkHandler";
import ProtectedPageWrapper from "@/components/layout/ProtectedPageWrapper";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedPageWrapper>
      <div className="page-container flex min-h-screen w-full">
        <SessionLinkHandler />
        <DashboardSidebar />
        <div className="flex-1 overflow-auto">
          <div className="content-section">
            {children}
          </div>
        </div>
      </div>
    </ProtectedPageWrapper>
  );
} 