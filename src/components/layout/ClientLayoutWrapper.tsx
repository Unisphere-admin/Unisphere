"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthLoadingScreen from "./AuthLoadingScreen";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "@/components/ui/sonner";
import { initializeCache } from "@/lib/cacheInitializer";
import { setupAuthCacheCheck } from "@/utils/authUtils";
import { prefetchTutors } from "@/lib/tutorsCaching";
import { needsAppProviders } from "@/lib/auth/needsAppProviders";

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({
  children,
}: ClientLayoutWrapperProps) {
  const { loading, silentLoading, user } = useAuth();
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isTutorsPage = pathname?.startsWith("/tutors");
  const isSurvey = pathname === "/survey"; // Add survey check
  const [isDev, setIsDev] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [cachePrefetched, setCachePrefetched] = useState(false);

  // Use ref instead of state to track initialization
  const cacheInitializedRef = useRef(false);

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === "development");
  }, []);

  // Track initial loading state
  useEffect(() => {
    if (!loading && initialLoad) {
      setInitialLoad(false);
    }
  }, [loading, initialLoad]);

  // Initialize caching system only once, and only AFTER auth has resolved,
  // a user is present, AND the current route actually needs the cached data.
  //
  // Marketing pages (`/`, `/about`, `/tutors`, `/testimonials`, etc.) don't
  // read conversations / sessions / messages, so prefetching them on those
  // routes burns ~2 seconds of `/api/conversations`, `/api/tutoring-sessions`,
  // and `/api/users/profile` calls with zero benefit. Restricting to app
  // routes (dashboard, session, resources, etc.) is what unblocks fast
  // home-page loads for logged-in users.
  useEffect(() => {
    if (loading) return;              // wait for auth to resolve
    if (!user) {
      // Anonymous visitor: cache prefetch not needed, mark complete so any
      // loading gates don't block render.
      setCachePrefetched(true);
      return;
    }
    if (!needsAppProviders(pathname)) {
      // Authenticated user, but on a marketing/public route. Skip the cache
      // prefetch entirely — the data isn't used here.
      setCachePrefetched(true);
      return;
    }
    if (cacheInitializedRef.current) return;

    initializeCache();
    cacheInitializedRef.current = true;

    const prefetchCommonData = async () => {
      try {
        if (
          (isDashboard || isTutorsPage) &&
          (user?.has_access || user?.role === "tutor")
        ) {
          await prefetchTutors();
        }
        setCachePrefetched(true);
      } catch {
        setCachePrefetched(true);
      }
    };

    prefetchCommonData();
  }, [loading, user, isDashboard, isTutorsPage, pathname]);

  // Setup auth cache check only once we know we actually have an authenticated
  // user. Same reasoning: no point burning a 5-minute auth-refresh interval
  // when nobody is signed in.
  useEffect(() => {
    if (loading || !user) return;
    setupAuthCacheCheck();
  }, [loading, user]);

  // Only block render on dashboard (where we need the cache prefetch to avoid
  // data flashes). Public pages render immediately - auth resolves in the background
  // and the Navbar / page guards update reactively.
  const showLoading = !cachePrefetched && isDashboard;

  if (showLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="page-container">
      {isDashboard || isSurvey ? (
        // For dashboard and survey routes, don't include the Navbar and Footer
        <>{children}</>
      ) : (
        // Regular layout for non-dashboard, non-survey routes
        <>
          <Navbar />
          <main className="page-content with-navbar min-h-[calc(100vh-var(--navbar-height))]">
            {children}
          </main>
          {!isDev && <Footer />}
        </>
      )}
    </div>
  );
}
