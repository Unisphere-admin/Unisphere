import { saveApiRequestForRetry } from './apiRedirect';
import { createClient } from "@/utils/supabase/client";

/**
 * Interface for fetch options with optional body
 */
interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Flag to prevent multiple parallel auth refreshes
 */
let refreshingAuth = false;

/**
 * Get the CSRF token from headers
 */
async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include', // Required for cookies
      headers: {
        'Cache-Control': 'no-cache', // Prevent caching
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch CSRF token:', response.status);
      return null;
    }

    // Get the token from the header
    const csrfToken = response.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      console.error('No CSRF token found in response');
    }

    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

/**
 * Attempt to refresh the auth token if it's expired or will expire soon
 * Returns true if refresh was successful, false otherwise
 */
async function refreshAuthToken(): Promise<boolean> {
  if (refreshingAuth) {
    // If already refreshing, wait a bit and return
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
  
  try {
    refreshingAuth = true;
    const supabase = createClient();
    
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("No authenticated user found during refresh:", userError);
        return false;
      }
      
      // Get current session to check expiry
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError || !authData.session) {
        // Handle specific cases like AuthSessionMissingError
        if (authError && (authError.name === 'AuthSessionMissingError' || authError.message?.includes('Auth session missing'))) {
          // Try to clear the session state to avoid repeated errors
          await supabase.auth.signOut({ scope: 'local' });
          return false;
        }
        
        console.error("No session found during refresh:", authError);
        return false;
      }
      
      // Check if token needs refreshing
      if (authData.session.expires_at) {
        const expiresAt = new Date(authData.session.expires_at * 1000);
        const now = new Date();
        const timeLeft = expiresAt.getTime() - now.getTime();
        
        // If less than 10 minutes left or already expired, refresh token
        if (timeLeft < 10 * 60 * 1000) {
          try {
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error || !data.session) {
              console.error("Failed to refresh auth token:", error);
              return false;
            }
            
            return true;
          } catch (refreshError: any) {
            // Handle specific error types during refresh
            if (refreshError.name === 'AuthSessionMissingError' || 
                refreshError.message?.includes('Auth session missing')) {
              await supabase.auth.signOut({ scope: 'local' });
            }
            
            console.error("Error during refresh:", refreshError);
            return false;
          }
        }
      }
      
      // Token is still valid
      return true;
    } catch (authError: any) {
      // Handle specific error types
      if (authError.name === 'AuthSessionMissingError' || 
          authError.message?.includes('Auth session missing')) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      
      console.error("Authentication error:", authError);
      return false;
    }
  } catch (error) {
    console.error("Error refreshing auth token:", error);
    return false;
  } finally {
    refreshingAuth = false;
  }
}

/**
 * A wrapper around the fetch API that handles authentication redirects and CSRF protection
 * 
 * @param endpoint The API endpoint to call
 * @param options Fetch options including method, headers, body, etc.
 * @returns Promise with the fetch response
 */
export async function protectedFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  // Prepare the options
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Always include credentials for cookies
  };

  // For non-GET requests, add CSRF token
  if (options.method && options.method !== 'GET') {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      (fetchOptions.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
    }
  }

  // Convert body to JSON string if present
  if (options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // Try to refresh the auth token first
  await refreshAuthToken();

  try {
    const response = await fetch(endpoint, fetchOptions);

    // Handle redirect response (middleware will redirect to login page)
    if (response.redirected && response.url.includes('/login')) {
      // Try one more auth refresh
      const refreshed = await refreshAuthToken();
      
      if (refreshed) {
        // If refresh was successful, retry the request
        const retryResponse = await fetch(endpoint, fetchOptions);
        
        if (!retryResponse.redirected) {
          // If retry succeeds, process the response
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => null);
            throw new Error(
              errorData?.error || `Request failed with status ${retryResponse.status}`
            );
          }
          
          return await retryResponse.json();
        }
      }
      
      // If we're still redirected after a refresh attempt, save the request for later retry
      saveApiRequestForRetry(
        endpoint,
        options.method || 'GET',
        options.body
      );

      // Throw an error to indicate the need to log in
      throw new Error('Authentication required. Please log in.');
    }

    // Handle HTTP errors
    if (!response.ok) {
      // For CSRF errors, retry with a fresh token
    if (response.status === 403) {
        try {
          const errorData = await response.json();
          if (errorData?.error?.includes('CSRF') || errorData?.message?.includes('CSRF')) {
            
            // Get a fresh token and retry
            const csrfToken = await getCsrfToken();
            
            if (csrfToken) {
              // Update headers with new token
              (fetchOptions.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
              
              // Retry the request
              const retryResponse = await fetch(endpoint, fetchOptions);
          
              if (retryResponse.ok) {
                return await retryResponse.json();
              }
              
              const retryErrorData = await retryResponse.json().catch(() => null);
              throw new Error(
                retryErrorData?.error || `Request failed with status ${retryResponse.status}`
              );
            }
          }
        } catch (e) {
          // If we can't parse the response as JSON, continue with the normal error handling
        }
      }
      
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || `Request failed with status ${response.status}`
      );
    }

    // Parse the response as JSON
    return await response.json();
  } catch (error) {
    // Re-throw the error for handling by the caller
    throw error;
  }
}

/**
 * Helper function for making protected GET requests
 */
export function protectedGet<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return protectedFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * Helper function for making protected POST requests
 */
export function protectedPost<T = any>(url: string, body: any, options: RequestInit = {}): Promise<T> {
  return protectedFetch<T>(url, { ...options, method: 'POST', body });
}

/**
 * Helper function for making protected PUT requests
 */
export function protectedPut<T = any>(url: string, body: any, options: RequestInit = {}): Promise<T> {
  return protectedFetch<T>(url, { ...options, method: 'PUT', body });
}

/**
 * Helper function for making protected DELETE requests
 */
export function protectedDelete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return protectedFetch<T>(url, { ...options, method: 'DELETE' });
} 