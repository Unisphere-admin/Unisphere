"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { shouldProtectRoute, PUBLIC_PATHS, isTutorProfilePath } from '@/lib/auth/protectResource';
import { resetPrefetchStatus } from '@/lib/prefetch';
import { clearAllCache } from '@/lib/caching';

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  role?: 'student' | 'tutor' | 'user';
  avatar_url?: string; // Primary source for user avatar image
  profilePic?: string; // Legacy field, maintained for backward compatibility
  hasProfile?: boolean;
  tokens?: number;
  bio?: string;
  has_access?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  silentLoading: boolean;
  error: string | null;
  refreshUser: (silent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [silentLoading, setSilentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(0);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const refreshUser = useCallback(async (silent = false) => {
    // Throttle refreshes to prevent multiple rapid calls
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshed;
    const MIN_REFRESH_INTERVAL = 2000; // 2 seconds minimum between refreshes
    
    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      return; // Skip refresh if called too frequently
    }
    
    try {
      // Use silent loading state if requested
      if (silent) {
        setSilentLoading(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      setLastRefreshed(now);
      
      // Get authenticated user - safer than getSession()
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }
      
      // Get session only for access_token data if needed
      const { data: { session: currentSession }, error: sessionError } = 
        await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error while refreshing user:', sessionError);
        // Continue since we already have the authenticated user
      }
      
      setSession(currentSession);
      
      if (authUser) {
        // Fetch user profile from API
        const userProfile = await fetchUserProfile();
        setUser(userProfile);
      } else {
        setUser(null);
      }
    } catch (error) {
      
      setError(error instanceof Error ? error.message : 'Unknown error');
      setUser(null);
    } finally {
      if (silent) {
        setSilentLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [lastRefreshed, supabase.auth]);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Get user ID before logout for cache clearing
      const userId = user?.id;
      
      // Clear all caches with comprehensive approach
      try {
        console.log('Clearing application cache...');
        
        // Clear general cache
        clearAllCache();
        resetPrefetchStatus();
        
        // Explicitly clear tutor cache 
        try {
          // Use dynamic import to avoid circular dependencies
          const { invalidateTutorsCache } = await import('@/lib/tutorsCaching');
          invalidateTutorsCache();
        } catch (e) {
          console.warn('Failed to explicitly invalidate tutor cache:', e);
        }
        
        // Clear localStorage items related to user data
        try {
          // Clear any pending API requests
          localStorage.removeItem('pendingApiRequest');
          
          // Clear conversations cache
          localStorage.removeItem('conversations');
          
          // Clear user-specific items using a prefix pattern
          const localStorageKeys = Object.keys(localStorage);
          localStorageKeys.forEach(key => {
            // Clear items that might contain user data
            if (
              key.startsWith('messages:') || 
              key.startsWith('conversation:') || 
              key.startsWith('user:') ||
              key.startsWith('session:') ||
              key.startsWith('cache:') ||
              key.includes('token') ||
              key.includes('auth')
            ) {
              localStorage.removeItem(key);
            }
            
            // Clear specific user items if we have the userId
            if (userId && key.includes(userId)) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('Failed to clear localStorage items:', e);
        }
        
        // Clear sessionStorage items
        try {
          // Clear all sessionStorage for simplicity
          sessionStorage.clear();
        } catch (e) {
          console.warn('Failed to clear sessionStorage:', e);
        }
        
        console.log('Application cache cleared successfully');
      } catch (cacheError) {
        console.error('Error clearing cache:', cacheError);
        // Continue with logout even if cache clearing fails
      }
      
      // Call the API logout endpoint instead of using Supabase client directly
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include credentials to ensure cookies are sent
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Logout failed');
      }
      
      // Clear user state
      setUser(null);
      setSession(null);
      
      // Clear any Supabase client state
      try {
        // This helps to ensure client-side state is also cleared
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error clearing client-side auth state:', err);
        // Continue even if this fails since we've already logged out on the server
      }
      
      console.log('Logout completed successfully');
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      // Even if there's an error, try to reset client state and redirect
      setUser(null);
      setSession(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial auth check
    refreshUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        
        setSession(newSession);
        
        // Only refresh user on meaningful auth events
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
          refreshUser(true); // Use silent refresh on auth events
        }
      }
    );
    
    // Handle visibility change to refresh session when tab becomes visible again
    // but only do a silent refresh
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Silently refresh when tab becomes visible again
        refreshUser(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUser]);

  // Check if route requires authentication and redirect if needed
  useEffect(() => {
    if (!loading && !isTutorProfilePath(pathname)) {
      const isProtectedRoute = shouldProtectRoute(pathname);
      const isPublicPath = PUBLIC_PATHS.some(path => 
        pathname === path || pathname.startsWith(`${path}/`)
      );

      if (isProtectedRoute && !user && !loading) {
        router.push('/login');
      } else if (user && isPublicPath && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      silentLoading,
      error, 
      refreshUser, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
