"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

// Constants that can be shared with server code
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_FORM_FIELD = "csrfToken";

/**
 * Store CSRF token in local storage for client-side access
 */
export function storeCsrfToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem('csrfToken', token);
}

/**
 * Get CSRF token from local storage
 */
export function getCsrfTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem('csrfToken');
}

/**
 * Clear CSRF token from storage
 */
export function clearStoredCsrfToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('csrfToken');
}

/**
 * Add CSRF token to fetch options
 */
export function addCsrfToken(options: RequestInit = {}, token: string): RequestInit {
  const headers = new Headers(options.headers || {});
  headers.set(CSRF_HEADER_NAME, token);
  
  return {
    ...options,
    headers,
    credentials: 'include',
  };
}

/**
 * React hook to get and manage CSRF token
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const failedAttemptsRef = useRef<number>(0);
  const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes
  const MAX_RETRY_ATTEMPTS = 3; // Limit retry attempts
  const isMountedRef = useRef(true); // Track component mount state
  const isLoginPageRef = useRef(false); // Track if we're on the login page
  
  // Reset error state when trying again
  const resetError = useCallback(() => {
    if (error) setError(null);
  }, [error]);
  
  const fetchCsrfToken = useCallback(async (force: boolean = false): Promise<string | null> => {
    resetError();
    
    // If we're on login page, don't keep retrying
    if (isLoginPageRef.current && window.location.pathname.includes('/login')) {
      console.debug('On login page, skipping CSRF token fetch');
      return null;
    }
    
    // If we've failed too many times, back off
    if (failedAttemptsRef.current >= MAX_RETRY_ATTEMPTS) {
      console.debug(`Reached max retry attempts (${MAX_RETRY_ATTEMPTS}), backing off`);
      return null;
    }
    
    // If we already have a token and it's not forced, return it
    const existingToken = getCsrfTokenFromStorage();
    
    // Check if token is recent enough (less than 25 minutes old)
    const now = Date.now();
    const isTooOld = lastFetchTimeRef.current > 0 && 
                     now - lastFetchTimeRef.current > TOKEN_REFRESH_INTERVAL;
    
    // Return existing token if it exists, is not forced, and not too old
    if (existingToken && !force && !isTooOld) {
      console.log('Using existing CSRF token from storage');
      setToken(existingToken);
      return existingToken;
    }
    
    try {
      setIsLoading(true);
      
      // Add cache-busting parameters
      const requestId = Math.random().toString(36).substring(2, 15);
      const url = `/api/csrf?t=${Date.now()}&r=${requestId}`;
      
      console.log(`Fetching fresh CSRF token from ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        // Check if it's an authentication error (expected for non-logged in users)
        if (response.status === 401) {
          // For auth errors, don't show a loud error, just a quiet log message
          console.log('CSRF token not available - user not authenticated');
          
          // Clear any existing token to prevent using an old one
          clearStoredCsrfToken();
          
          throw new Error('Not authenticated');
        }
        
        // For other errors, handle normally
        const errorText = await response.text();
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.token) {
        throw new Error('Invalid CSRF token response');
      }
      
      // Store the token
      storeCsrfToken(data.token);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setToken(data.token);
        lastFetchTimeRef.current = now;
      }
      
      console.log(`CSRF token fetched successfully: ${data.token.substring(0, 6)}... at ${new Date().toISOString()}`);
      return data.token;
    } catch (error) {
      // Only log detailed errors if they're not authentication-related
      if (error instanceof Error && error.message !== 'Not authenticated') {
        console.error('Error fetching CSRF token:', error);
      }
      
      failedAttemptsRef.current++;
      
      if (isMountedRef.current) {
        setError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [resetError]);
  
  // Set up automatic token refresh
  useEffect(() => {
    isMountedRef.current = true;
    
    // Check if we're on login page
    isLoginPageRef.current = window.location.pathname.includes('/login');
    
    // Initialize token on mount (but not on login page)
    if (!isLoginPageRef.current) {
      fetchCsrfToken().catch(err => {
        // For auth errors, this is expected for non-logged in users
        if (err instanceof Error && err.message === 'Not authenticated') {
          console.log('Initialization - User not authenticated for CSRF token');
        } else {
          console.error('Error initializing CSRF token:', err);
        }
      });
    }
    
    // Set up interval to refresh token
    const intervalId = setInterval(() => {
      // Only refresh if we're not on login page and we haven't failed too many times
      if (!isLoginPageRef.current && failedAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
        console.log('Refreshing CSRF token...');
        fetchCsrfToken(true).catch(err => {
          // For auth errors, this is expected for non-logged in users
          if (err instanceof Error && err.message === 'Not authenticated') {
            console.log('Refresh - User not authenticated for CSRF token');
          } else {
          console.error('Error refreshing CSRF token:', err);
          }
        });
      }
    }, TOKEN_REFRESH_INTERVAL);
    
    // Cleanup interval on unmount
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchCsrfToken]);
  
  return { token, isLoading, error, fetchCsrfToken };
}

/**
 * Function to create protected fetch requests with CSRF tokens
 */
export function createProtectedFetchWithCsrf(token: string | null) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Start with default options
    const fetchOptions: RequestInit = {
      ...options,
      credentials: 'include', // Always include credentials for cookies
    };
    
    // Add CSRF token for non-GET requests if available
    if (token && options.method && options.method !== 'GET') {
      const headers = new Headers(options.headers || {});
      headers.set(CSRF_HEADER_NAME, token);
      fetchOptions.headers = headers;
    }
    
    // Make the request
    return fetch(url, fetchOptions);
  };
} 