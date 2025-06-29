"use client";

import { ReactNode, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthLoadingScreen from './AuthLoadingScreen';
import { usePathname } from 'next/navigation';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "@/components/ui/sonner";
import { initializeCache } from '@/lib/cacheInitializer';
import { setupAuthCacheCheck } from '@/utils/authUtils';
import { prefetchTutors } from '@/lib/tutorsCaching';
import { useSessions } from '@/context/SessionContext';

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { loading, silentLoading, user } = useAuth();
  const { sessions, refreshSessions } = useSessions();
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const isTutorsPage = pathname?.startsWith('/tutors');
  const [isDev, setIsDev] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [cachePrefetched, setCachePrefetched] = useState(false);
  
  // Use ref instead of state to track initialization
  const cacheInitializedRef = useRef(false);
  const sessionsInitializedRef = useRef(false);
  
  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);
  
  // Track initial loading state
  useEffect(() => {
    if (!loading && initialLoad) {
      setInitialLoad(false);
    }
  }, [loading, initialLoad]);
  
  // Initialize caching system immediately when component mounts - only once
  useEffect(() => {
    if (!cacheInitializedRef.current) {
      
      // Initialize the cache system immediately
      initializeCache();
      cacheInitializedRef.current = true;
      
      // Start prefetching key data for common routes
      const prefetchCommonData = async () => {
        try {
          // Only prefetch tutors data if on dashboard or tutors page
          // No need to prefetch premium data if user doesn't have access
          if ((isDashboard || isTutorsPage) && (user?.has_access || user?.role === 'tutor')) {
            await prefetchTutors();
          }
          setCachePrefetched(true);
        } catch (err) {
          setCachePrefetched(true); // Consider prefetch complete even on error
        }
      };
      
      prefetchCommonData();
    }
  }, [isDashboard, isTutorsPage, user?.has_access, user?.role]);
  
  // Setup auth cache check on component mount - separate from cache initialization
  useEffect(() => {
    setupAuthCacheCheck();
  }, []);

  // Ensure session state is synced between tabs on initial load
  useEffect(() => {
    if (user && !sessionsInitializedRef.current && isDashboard) {
      sessionsInitializedRef.current = true;
      
      // Check if we have session data in localStorage that might be newer
      try {
        const lastUpdatedTimestamp = localStorage.getItem('session_cache_invalidated');
        const sessionDataStr = localStorage.getItem('last_updated_session');
        
        if (lastUpdatedTimestamp || sessionDataStr) {
          // If we have any cached session data, refresh sessions to ensure we're in sync
          refreshSessions();
          
          // Fire an event to ensure session data is properly updated across all components
          if (typeof window !== 'undefined') {
            const syncEvent = new Event('session-list-updated');
            window.dispatchEvent(syncEvent);
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [user, isDashboard, refreshSessions]);
  
  // Show loading screen during initial auth load and critical data prefetch
  // This prevents "no data" flashes
  const showLoading = (loading && initialLoad) || (!cachePrefetched && isDashboard);
  
  if (showLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="page-container">
      {isDashboard ? (
        // For dashboard routes, don't include the Navbar and Footer
        <>{children}</>
      ) : (
        // Regular layout for non-dashboard routes
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