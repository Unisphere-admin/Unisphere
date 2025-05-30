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

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { loading, silentLoading, user } = useAuth();
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const [isDev, setIsDev] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Use ref instead of state to track initialization
  const cacheInitializedRef = useRef(false);
  
  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);
  
  // Track initial loading state
  useEffect(() => {
    if (!loading && initialLoad) {
      setInitialLoad(false);
    }
  }, [loading, initialLoad]);
  
  // Initialize caching system when the app loads - only once
  useEffect(() => {
    if (!cacheInitializedRef.current) {
      console.log('Initializing cache system on application load');
      
      // Initialize the cache system (works for both authenticated and unauthenticated users)
      initializeCache();
      cacheInitializedRef.current = true;
    }
  }, []);
  
  // Setup auth cache check on component mount - separate from cache initialization
  useEffect(() => {
    console.log('Setting up auth cache check mechanism');
    setupAuthCacheCheck();
  }, []);
  
  // Only show loading screen on initial authentication load
  // Don't show loading for silent background refreshes
  if (loading && initialLoad) {
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