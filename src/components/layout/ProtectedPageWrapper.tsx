"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedPageWrapperProps {
  children: React.ReactNode;
}

// Pages that require payment — free authenticated users get redirected to /credits
function isPaywallPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/dashboard/messages' ||
    pathname.startsWith('/dashboard/messages/') ||
    pathname === '/dashboard/schedule' ||
    pathname.startsWith('/dashboard/schedule/') ||
    pathname === '/dashboard/history' ||
    pathname.startsWith('/dashboard/history/') ||
    pathname === '/dashboard/reviews' ||
    pathname.startsWith('/dashboard/reviews/') ||
    pathname.startsWith('/dashboard/leave-review/')
  );
}

export default function ProtectedPageWrapper({ children }: ProtectedPageWrapperProps) {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const hasAccess = user.role === 'tutor' || user.has_access === true;
    if (!hasAccess && isPaywallPath(pathname)) {
      router.push('/credits');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in — don't flash content while redirecting
  if (!user) return null;

  const hasAccess = user.role === 'tutor' || user.has_access === true;

  // Block paywalled pages for free users
  if (!hasAccess && isPaywallPath(pathname)) return null;

  return <>{children}</>;
}
