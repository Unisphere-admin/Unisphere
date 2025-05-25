"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthLoadingScreen from './AuthLoadingScreen';
import { usePathname } from 'next/navigation';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "@/components/ui/sonner";
import { initPrefetching } from '@/lib/prefetch';
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
  
  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);
  
  // Track initial loading state
  useEffect(() => {
    if (!loading && initialLoad) {
      setInitialLoad(false);
    }
  }, [loading, initialLoad]);
  
  // Initialize prefetching when the app loads and user is authenticated
  useEffect(() => {
    if (user && initialLoad) {
      console.log('Initializing prefetching for authenticated user on initial app load');
      initPrefetching();
    }
  }, [user, initialLoad]);
  
  // Setup auth cache check on component mount
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