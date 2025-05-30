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
      
      // Using a timestamp to bust cache and a random value to prevent collision
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const url = `/api/csrf?t=${timestamp}&r=${random}`;
      
      console.log(`Fetching fresh CSRF token from ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        // Don't follow redirects automatically
        redirect: 'manual'
      });
      
      // Check if we got redirected to login page
      if (response.type === 'opaqueredirect' || response.status === 307) {
        console.debug('Redirected to login page, user not authenticated');
        isLoginPageRef.current = true;
        failedAttemptsRef.current++;
        return null;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${errorText}`);
      }
      
      // Reset counters on success
      failedAttemptsRef.current = 0;
      isLoginPageRef.current = false;
      
      const data = await response.json();
      // The server sends the token as either token or csrfToken
      const newToken = data.token || data.csrfToken;
      
      if (!newToken) {
        console.error('Token response structure:', data);
        throw new Error('No token received from server');
      }
      
      // Store the token for future requests
      storeCsrfToken(newToken);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setToken(newToken);
        lastFetchTimeRef.current = now;
      }
      
      console.log(`CSRF token fetched successfully: ${newToken.substring(0, 6)}... at ${new Date().toISOString()}`);
      return newToken;
    } catch (err) {
      console.error('Error fetching CSRF token:', err);
      failedAttemptsRef.current++;
      
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      return null;
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
      fetchCsrfToken();
    }
    
    // Set up interval to refresh token
    const intervalId = setInterval(() => {
      // Only refresh if we're not on login page and we haven't failed too many times
      if (!isLoginPageRef.current && failedAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
        console.log('Refreshing CSRF token...');
        fetchCsrfToken(true).catch(err => {
          console.error('Error refreshing CSRF token:', err);
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