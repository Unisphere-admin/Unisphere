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
        console.warn('Failed to fetch CSRF token:', response.status);
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
    console.log('%c[Auth Diagnostics] Checking authentication token status...', 'color: blue; font-weight: bold');
    
    const supabase = createClient();
    
    // Get current session
    console.log('[Auth Diagnostics] Fetching current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Auth Diagnostics] Error getting session:', sessionError);
      return;
    }
    
    if (!sessionData.session) {
      console.warn('[Auth Diagnostics] No active session found. User is not authenticated.');
      return;
    }
    
    // Get user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[Auth Diagnostics] Error getting user:', userError);
    } else if (userData.user) {
      console.log('[Auth Diagnostics] Authenticated user:', {
        id: userData.user.id,
        email: userData.user.email,
        lastSignIn: userData.user.last_sign_in_at
      });
    }
    
    // Check token expiration
    const token = sessionData.session.access_token;
    
    if (!token) {
      console.error('[Auth Diagnostics] Session exists but no access token found');
      return;
    }
    
    console.log('[Auth Diagnostics] Access token found, checking expiration...');
    
    // Use the logTokenExpiration utility to display token expiry details
    logTokenExpiration(token, sessionData.session.expires_at ? sessionData.session.expires_at * 1000 : undefined);
    
    // Try to refresh the token
    console.log('[Auth Diagnostics] Attempting to refresh token...');
    const refreshed = await refreshTokenIfNeeded(supabase);
    
    if (refreshed) {
      console.log('%c[Auth Diagnostics] Token refresh successful or not needed', 'color: green; font-weight: bold');
    } else {
      console.error('%c[Auth Diagnostics] Failed to refresh token', 'color: red; font-weight: bold');
    }
    
    // Output how to use this utility
    console.log(
      '%c[Auth Diagnostics] To check token status at any time, run this in console: checkAuthToken()',
      'color: purple; font-style: italic'
    );
    
    // Return the current session data for inspection
    return sessionData.session;
  } catch (error) {
    console.error('[Auth Diagnostics] An error occurred during token check:', error);
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