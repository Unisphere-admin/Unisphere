"use client";

import { useState, useEffect, useCallback } from 'react';

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
  const [error, setError] = useState<string | null>(null);
  
  // Try to get token from storage on mount
  useEffect(() => {
    const storedToken = getCsrfTokenFromStorage();
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);
  
  // Function to fetch a new token from the server
  const fetchToken = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First attempt with JSON headers
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        // If we get a 401 Unauthorized, that's expected when not logged in
        if (response.status === 401) {
          console.log('Not authenticated yet, CSRF token will be fetched after login');
          return null; // Return null instead of throwing an error
        }
        
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Get the raw text first for debugging
      const rawText = await response.text();
      
      // Check if the response is HTML (login page redirect) by looking for common HTML markers
      if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html')) {
        console.log('Received HTML instead of JSON - likely redirected to login page');
        return null; // We're not authenticated, return null without error
      }
      
      // Don't try to parse if empty
      if (!rawText || rawText.trim() === '') {
        throw new Error('Empty response from server');
      }
      
      // Try to parse the text as JSON
      try {
        const data = JSON.parse(rawText);
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format: not an object');
        }
        
        if (!data.csrfToken) {
          throw new Error('Invalid response format: missing CSRF token');
        }
        
        const newToken = data.csrfToken;
        
        // Store the token
        setToken(newToken);
        storeCsrfToken(newToken);
        
        return newToken;
      } catch (parseError) {
        // Don't log the entire HTML response as it's too verbose
        if (rawText.length > 200 && (rawText.includes('<!DOCTYPE') || rawText.includes('<html'))) {
          console.error('Error: Received HTML page instead of JSON CSRF token response');
        } else {
          console.error('Error parsing CSRF token response:', parseError);
          console.error('Raw response (first 100 chars):', rawText.substring(0, 100));
        }
        throw new Error('Failed to parse CSRF token response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Don't set error for authentication redirects
      if (errorMessage.includes('HTML') || errorMessage.includes('login page')) {
        console.log('Note: CSRF token not available yet - user needs to log in first');
        return null;
      }
      
      setError(errorMessage);
      console.error('Error fetching CSRF token:', errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Function to clear the token
  const clearToken = useCallback(() => {
    setToken(null);
    clearStoredCsrfToken();
  }, []);
  
  return {
    csrfToken: token,
    fetchCsrfToken: fetchToken,
    clearCsrfToken: clearToken,
    isLoading,
    error,
  };
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