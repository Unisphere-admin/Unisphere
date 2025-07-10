"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedPageWrapperProps {
  children: React.ReactNode;
}

export default function ProtectedPageWrapper({ children }: ProtectedPageWrapperProps) {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if the current path is the settings page
  const isSettingsPage = pathname === '/dashboard/settings' || pathname?.startsWith('/dashboard/settings/');

  useEffect(() => {
    // Wait until auth is loaded
    if (loading) return;

    // Refresh user on component mount to ensure latest data
  }, [refreshUser]);

  useEffect(() => {
    // Wait until auth is loaded
    if (loading) return;

    // Check if user has premium access
    const hasAccess = user?.role === 'tutor' || user?.has_access === true;
    
    // Add debug logging
    
    // If not authenticated, redirect to login
    if (!user) {
      router.replace('/login');
    } 
    // If settings page, allow access to any authenticated user
    else if (!hasAccess && !isSettingsPage) {
      // Object was part of a removed console.warn statement
      router.push('/paywall');
      // Don't return null from useEffect
    }
  }, [user, loading, router, pathname, isSettingsPage]);

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, don't render content (will redirect)
  if (!user) {
    return null;
  }

  // For settings page, don't check premium access
  if (isSettingsPage) {
    return <>{children}</>;
  }

  // For other pages, check access explicitly - using both tutor role and has_access flag
  const hasAccess = user.role === 'tutor' || user.has_access === true;
  
  // If no access, don't render content (will redirect)
  if (!hasAccess) {
    return null;
  }

  // User has access, render the children
  return <>{children}</>;
} 