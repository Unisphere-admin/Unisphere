"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

// Constants that can be shared with server code
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_FORM_FIELD = "csrfToken";

// Configuration
const CSRF_STORAGE_KEY = 'csrfToken';
const CSRF_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const CSRF_LAST_FETCH_KEY = 'csrfLastFetch';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Store CSRF token in memory and sessionStorage for better security
 * (localStorage is more vulnerable to XSS)
 */
let inMemoryToken: string | null = null;

export function storeCsrfToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Store in memory (primary storage)
    inMemoryToken = token;
    
    // Also store in sessionStorage as backup
    // This helps when the page refreshes but session is maintained
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    sessionStorage.setItem(CSRF_LAST_FETCH_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error storing CSRF token:', error);
  }
}

/**
 * Get CSRF token from memory first, fallback to sessionStorage
 */
export function getCsrfTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Prefer memory token if available
  if (inMemoryToken) {
    return inMemoryToken;
  }
  
  try {
    // Fall back to sessionStorage
    const token = sessionStorage.getItem(CSRF_STORAGE_KEY);
    
    // If found in sessionStorage but not in memory, restore it to memory
    if (token) {
      inMemoryToken = token;
    }
    
    return token;
  } catch (error) {
    console.error('Error retrieving CSRF token:', error);
    return null;
  }
}

/**
 * Clear CSRF token from all storage mechanisms
 */
export function clearStoredCsrfToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Clear from memory
    inMemoryToken = null;
    
    // Clear from sessionStorage
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
    sessionStorage.removeItem(CSRF_LAST_FETCH_KEY);
    
    // Also clear from localStorage if it might be there from previous versions
    localStorage.removeItem(CSRF_STORAGE_KEY);
    localStorage.removeItem(CSRF_LAST_FETCH_KEY);
  } catch (error) {
    console.error('Error clearing CSRF token:', error);
  }
}

/**
 * Check if stored token is likely expired based on our client-side tracking
 */
export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  
  try {
    const lastFetchStr = sessionStorage.getItem(CSRF_LAST_FETCH_KEY);
    if (!lastFetchStr) {
      return true;
    }
    
    const lastFetch = parseInt(lastFetchStr, 10);
    if (isNaN(lastFetch)) {
      return true;
    }
    
    return Date.now() - lastFetch > CSRF_REFRESH_INTERVAL;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired on error
  }
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
  const failedAttemptsRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef<boolean>(false);
  const fetchPromiseRef = useRef<Promise<string | null> | null>(null);
  
  // Used to track if the current page is the login page
  const isLoginPageRef = useRef(false);
  useEffect(() => {
    isLoginPageRef.current = window.location.pathname.includes('/login');
  }, []);
  
  // Reset error state when trying again
  const resetError = useCallback(() => {
    if (error) setError(null);
  }, [error]);
  
  /**
   * Fetch a new CSRF token from the server
   */
  const fetchCsrfToken = useCallback(async (force: boolean = false): Promise<string | null> => {
    // If already fetching, return the existing promise
    if (fetchingRef.current && fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }
    
    // Create a new fetch promise
    fetchingRef.current = true;
    fetchPromiseRef.current = (async () => {
      try {
    resetError();
    
    // If we're on login page, don't keep retrying
        if (isLoginPageRef.current) {
      return null;
    }
    
    // If we've failed too many times, back off
    if (failedAttemptsRef.current >= MAX_RETRY_ATTEMPTS) {
      return null;
    }
    
        // Check if we can use the existing token
        if (!force && !isTokenExpired()) {
    const existingToken = getCsrfTokenFromStorage();
          if (existingToken) {
      setToken(existingToken);
      return existingToken;
          }
    }
    
      setIsLoading(true);
      
      // Add cache-busting parameters
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const url = `/api/csrf?t=${timestamp}&r=${randomId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
          cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
          // If unauthorized, don't show loud errors
        if (response.status === 401) {
          clearStoredCsrfToken();
            return null;
          }
          
        const errorText = await response.text();
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${errorText}`);
      }
      
        // Get token from header
        const csrfToken = response.headers.get('X-CSRF-Token');
      
        if (!csrfToken) {
          throw new Error('No CSRF token found in response');
      }
      
        // Store the token in our storage mechanisms
        storeCsrfToken(csrfToken);
      
        // Reset failed attempts counter on success
        failedAttemptsRef.current = 0;
        
        // Update state if component is still mounted
      if (isMountedRef.current) {
          setToken(csrfToken);
      }
      
        return csrfToken;
    } catch (error) {
      failedAttemptsRef.current++;
      
      if (isMountedRef.current) {
        setError(error instanceof Error ? error : new Error(String(error)));
      }
        
        // Implement retry with exponential backoff if needed
        if (failedAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
          const backoffDelay = RETRY_DELAY * Math.pow(2, failedAttemptsRef.current - 1);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return fetchCsrfToken(force);
        }
        
        return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
        fetchingRef.current = false;
        fetchPromiseRef.current = null;
      }
    })();
    
    return fetchPromiseRef.current;
  }, [error, resetError]);
  
  /**
   * Force refresh the token
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    return fetchCsrfToken(true);
  }, [fetchCsrfToken]);
  
  /**
   * Get token, fetching a new one only if necessary
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    // First check if we already have a valid token
    const existingToken = getCsrfTokenFromStorage();
    if (existingToken && !isTokenExpired()) {
      return existingToken;
    }
    
    // Otherwise fetch a new one
    return fetchCsrfToken();
  }, [fetchCsrfToken]);
  
  // Initialize token and set up refresh interval
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    if (!isLoginPageRef.current) {
      fetchCsrfToken().catch(() => {}); // Errors are already handled internally
    }
    
    // Periodic refresh
    const intervalId = setInterval(() => {
      // Check if token needs refreshing
      if (!isLoginPageRef.current && isTokenExpired() && failedAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
        fetchCsrfToken().catch(() => {});
      }
    }, 60000); // Check every minute
    
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchCsrfToken]);
  
  return {
    token,
    isLoading,
    error,
    fetchToken: fetchCsrfToken,
    fetchCsrfToken,
    refreshToken,
    getToken
  };
}

/**
 * Function to create protected fetch requests with CSRF tokens
 */
export function createProtectedFetchWithCsrf(tokenProvider: () => Promise<string | null>) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Get method, defaults to GET
    const method = options.method || 'GET';
    
    // Start with default options
    const fetchOptions: RequestInit = {
      ...options,
      credentials: 'include', // Always include credentials for cookies
    };
    
    // For non-GET requests, add CSRF token
    if (method !== 'GET') {
      try {
        const token = await tokenProvider();
        if (token) {
      const headers = new Headers(options.headers || {});
      headers.set(CSRF_HEADER_NAME, token);
      fetchOptions.headers = headers;
        }
      } catch (error) {
        console.error('Error getting CSRF token for fetch:', error);
      }
    }
    
    // Make the request
    const response = await fetch(url, fetchOptions);
    
    // If we get a 403 with CSRF error, try to refresh token and retry once
    if (response.status === 403) {
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes('CSRF')) {
          // Try to refresh token
          const newToken = await tokenProvider();
          if (newToken) {
            // Retry the request with new token
            const headers = new Headers(options.headers || {});
            headers.set(CSRF_HEADER_NAME, newToken);
            return fetch(url, {
              ...fetchOptions,
              headers
            });
          }
        }
      } catch (e) {
        // If we can't parse the response as JSON, just return the original response
      }
    }
    
    return response;
  };
} 