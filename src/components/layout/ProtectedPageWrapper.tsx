"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedPageWrapperProps {
  children: React.ReactNode;
}

export default function ProtectedPageWrapper({ children }: ProtectedPageWrapperProps) {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth is loaded
    if (loading) return;

    // Refresh user on component mount to ensure latest data
    refreshUser(true).catch(err => console.error("Error refreshing user data:", err));
  }, [refreshUser]);

  useEffect(() => {
    // Wait until auth is loaded
    if (loading) return;

    // Check if user has premium access
    const hasAccess = user?.role === 'tutor' || user?.has_access === true;
    
    // Add debug logging
    console.log(`ProtectedPageWrapper access check: user=${user?.id}, role=${user?.role}, has_access=${user?.has_access}, hasAccess=${hasAccess}`);
    
    // If not authenticated or doesn't have access, redirect to paywall
    if (!user) {
      router.replace('/login');
    } else if (!hasAccess) {
      console.warn('User does not have premium access, redirecting to paywall', {
        id: user.id,
        role: user.role,
        has_access: user.has_access
      });
      router.replace('/paywall');
    }
  }, [user, loading, router]);

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

  // Check access explicitly - using both tutor role and has_access flag
  const hasAccess = user.role === 'tutor' || user.has_access === true;
  
  // If no access, don't render content (will redirect)
  if (!hasAccess) {
    return null;
  }

  // User has access, render the children
  return <>{children}</>;
} 