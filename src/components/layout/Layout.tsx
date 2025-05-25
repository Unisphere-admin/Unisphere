"use client";

import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        {isDashboard && user && (
          <DashboardSidebar />
        )}
        <main className={`flex-1 ${isDashboard ? 'ml-0 sm:ml-64' : ''}`}>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
