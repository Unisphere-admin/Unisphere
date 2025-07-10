import { createClient } from './supabase/client';
import { invalidateCache, CACHE_CONFIG } from '@/lib/caching';
import { clearStoredCsrfToken } from '@/lib/csrf/client';
import { logTokenExpiration, refreshTokenIfNeeded } from '@/lib/auth/tokenRefresh';

/**
 * Checks if the user is authenticated and clears tutor cache if not
 * @returns Promise<boolean> - Whether the user is authenticated
 */
export async function checkAuthAndClearCacheIfNeeded(): Promise<boolean> {
  try {
    // Use the singleton client instead of creating a new one
    const supabase = createClient();
    
    // Check authentication status
    const { data, error } = await supabase.auth.getUser();
    
    // If not authenticated, clear tutors cache and CSRF token
    if (error || !data.user) {
      invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
      clearStoredCsrfToken(); // Clear CSRF token when logged out
      return false;
    }
    
    return true;
  } catch (err) {
    // Clear cache on error to be safe
    invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
    return false;
  }
}

/**
 * Fetches a new CSRF token if the user is authenticated
 */
export async function fetchCsrfTokenIfAuthenticated(): Promise<void> {
  try {
    // Check if user is authenticated first
    const isAuthenticated = await checkAuthAndClearCacheIfNeeded();
    
    if (isAuthenticated) {
      // Fetch new CSRF token
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        return;
      }
      
      // Process response
      const data = await response.json();
      
      if (data.csrfToken) {
        // Store token locally (client.ts module handles this)
        localStorage.setItem('csrfToken', data.csrfToken);
      }
    }
  } catch (error) {
  }
}

/**
 * This function is called on application startup to ensure
 * no cached tutor data is accessible to unauthenticated users
 */
export function setupAuthCacheCheck() {
  // Check immediately on page load
  checkAuthAndClearCacheIfNeeded();
  
  // Also fetch CSRF token if needed
  fetchCsrfTokenIfAuthenticated();
  
  // Check whenever the page visibility changes (user returns to app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAuthAndClearCacheIfNeeded();
      fetchCsrfTokenIfAuthenticated();
    }
  });
  
  // Setup periodic check every 5 minutes
  setInterval(() => {
    checkAuthAndClearCacheIfNeeded();
    fetchCsrfTokenIfAuthenticated();
  }, 5 * 60 * 1000);
}

/**
 * Utility function to check token status from the browser console
 * This can be called by developers to diagnose token issues
 */
export async function checkAuthToken() {
  try {
    
    const supabase = createClient();
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return;
    }
    
    if (!sessionData.session) {
      return;
    }
    
    // Get user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
    } else if (userData.user) {
      // Object was part of a removed console statement
    }
    
    // Check token expiration
    const token = sessionData.session.access_token;
    
    if (!token) {
      return;
    }
    
    
    // Use the logTokenExpiration utility to display token expiry details
    logTokenExpiration(token, sessionData.session.expires_at ? sessionData.session.expires_at * 1000 : undefined);
    
    // Try to refresh the token
    const refreshed = await refreshTokenIfNeeded(supabase);
    
    if (refreshed) {
    } else {
    }
    
    // Return the current session data for inspection
    return sessionData.session;
  } catch (error) {
    return null;
  }
}

// Make the utility available globally in development environments
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).checkAuthToken = checkAuthToken;
  
  // Log a message to help developers
  console.info(
    '%c[Auth Utils] Token diagnostic utility available. Run checkAuthToken() to check token status.',
    'color: blue; font-weight: bold'
  );
} 