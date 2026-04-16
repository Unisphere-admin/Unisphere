"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { shouldProtectRoute, PUBLIC_PATHS, isTutorProfilePath } from '@/lib/auth/protectResource';
import { resetPrefetchStatus } from '@/lib/prefetch';
import { clearAllCache } from '@/lib/caching';
import { initializeTokenRefresh, refreshTokenIfNeeded } from '@/lib/auth/tokenRefresh';

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

const PROFILE_CACHE_KEY = 'auth_user_profile_cache';
const PROFILE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function getCachedProfile(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > PROFILE_CACHE_TTL_MS) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    return data as AuthUser;
  } catch {
    return null;
  }
}

function setCachedProfile(profile: AuthUser): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ data: profile, timestamp: Date.now() }));
  } catch {}
}

function clearCachedProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [silentLoading, setSilentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshedRef = useRef(0);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const refreshCleanupRef = useRef<(() => void) | null>(null);

  const fetchUserProfile = async (forceRefresh = false) => {
    // Return cached profile if available and not forcing refresh
    if (!forceRefresh) {
      const cached = getCachedProfile();
      if (cached) return cached;
    }

    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      const profile = data.user || null;

      if (profile) {
        setCachedProfile(profile);
      }

      return profile;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  const refreshUser = useCallback(async (silent = false) => {
    // Throttle refreshes to prevent multiple rapid calls
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshedRef.current;
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
      lastRefreshedRef.current = now;

      // First ensure token is refreshed if needed
      await refreshTokenIfNeeded(supabase);

      // Parallelize getUser + getSession -- both are independent
      const [userResult, sessionResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);

      if (userResult.error) {
        throw userResult.error;
      }

      setSession(sessionResult.data?.session ?? null);

      if (userResult.data?.user) {
        // Fetch user profile from API (force refresh on explicit refreshUser calls)
        const userProfile = await fetchUserProfile(silent ? false : true);
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
  }, [supabase]);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Get user ID before logout for cache clearing
      const userId = user?.id;
      
      // Clear all caches with comprehensive approach
      try {
        
        // Clear general cache
      clearAllCache();
      resetPrefetchStatus();
      
        // Explicitly clear tutor cache 
        try {
          // Use dynamic import to avoid circular dependencies
          const { invalidateTutorsCache } = await import('@/lib/tutorsCaching');
          invalidateTutorsCache();
        } catch (e) {
        }
        
        // Clear localStorage items related to user data
        try {
      // Clear any pending API requests
          localStorage.removeItem('pendingApiRequest');
          
          // Clear conversations cache
          localStorage.removeItem('conversations');
          
          // Clear temporary conversations and their mappings
          localStorage.removeItem('tempConversations');
          localStorage.removeItem('tempToRealConversions');
          
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
        }
        
        // Clear sessionStorage items
        try {
          // Clear all sessionStorage for simplicity
          sessionStorage.clear();
      } catch (e) {
        }
        
      } catch (cacheError) {
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
      
      // Clear profile cache and user state
      clearCachedProfile();
      setUser(null);
      setSession(null);
      
      // Clear any Supabase client state
      try {
        // This helps to ensure client-side state is also cleared
        await supabase.auth.signOut();
      } catch (err) {
        // Continue even if this fails since we've already logged out on the server
      }
      
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
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
      (event: AuthChangeEvent, newSession: Session | null) => {
        
        setSession(newSession);
        
        if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed -- just update session, no need to re-fetch profile
          setSession(newSession);
        } else if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
          refreshUser(true); // Use silent refresh on meaningful auth events
        }
      }
    );
    
    // Initialize token refresh system when component mounts
    if (typeof window !== 'undefined') {
      // Clean up any existing refresh system
      if (refreshCleanupRef.current) {
        refreshCleanupRef.current();
      }
      
      // Initialize new token refresh system and store cleanup function
      refreshCleanupRef.current = initializeTokenRefresh();
    }
    
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
      
      // Clean up the token refresh system
      if (refreshCleanupRef.current) {
        refreshCleanupRef.current();
        refreshCleanupRef.current = null;
      }
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
