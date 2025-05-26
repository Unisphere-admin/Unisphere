import { saveApiRequestForRetry } from './apiRedirect';
import { createClient } from "@/utils/supabase/client";
import { 
  addCsrfToken, 
  getCsrfTokenFromStorage as getTokenFromStorage,
  storeCsrfToken as storeToken,
  clearStoredCsrfToken as clearToken
} from "@/lib/csrf/client";

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
          console.log("Auth session is missing, attempting to sign out and clear session");
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
          console.log("Refreshing auth token");
          try {
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error || !data.session) {
              console.error("Failed to refresh auth token:", error);
              return false;
            }
            
            console.log("Auth token refreshed successfully");
            return true;
          } catch (refreshError: any) {
            // Handle specific error types during refresh
            if (refreshError.name === 'AuthSessionMissingError' || 
                refreshError.message?.includes('Auth session missing')) {
              console.log("Auth session is missing during refresh, clearing session");
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
        console.log("Auth session is missing, clearing session");
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
 * Get CSRF token from cookies or local storage
 * @deprecated Use getTokenFromStorage from csrf/client directly
 */
function getCsrfTokenFromStorage(): string | null {
  return getTokenFromStorage();
}

/**
 * Store CSRF token in local storage for client-side access
 * @deprecated Use storeToken from csrf/client directly
 */
export function storeCsrfToken(token: string): void {
  storeToken(token);
}

/**
 * Clear CSRF token from storage
 * @deprecated Use clearToken from csrf/client directly
 */
export function clearStoredCsrfToken(): void {
  clearToken();
}

/**
 * A wrapper around the fetch API that handles authentication redirects
 * and saves the request for retry after login
 * 
 * @param endpoint The API endpoint to call
 * @param options Fetch options including method, headers, body, etc.
 * @returns Promise with the fetch response
 */
export async function protectedFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {},
  csrfToken?: string
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

  // Convert body to JSON string if present
  if (options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // Get CSRF token from param, storage, or do nothing
  const token = csrfToken || getCsrfTokenFromStorage();
  
  // If we have a token and this is not a GET request, add CSRF token
  if (token && options.method && options.method !== 'GET') {
    addCsrfToken(fetchOptions, token);
  }

  // Try to refresh the token first
  await refreshAuthToken();

  try {
    const response = await fetch(endpoint, fetchOptions);

    // Handle redirect response (middleware will redirect to login page)
    if (response.redirected && response.url.includes('/login')) {
      // Try one more refresh
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

    // Handle CSRF token refresh if needed
    if (response.status === 403) {
      const responseData = await response.json();
      
      // If error is related to CSRF, try to get a new token and retry
      if (responseData.error && responseData.error.includes('CSRF')) {
        try {
          // Fetch a new CSRF token
          const tokenResponse = await fetch('/api/csrf', {
            credentials: 'include',
          });
          
          if (tokenResponse.ok) {
            const { csrfToken: newToken } = await tokenResponse.json();
            
            // Store the new token
            storeCsrfToken(newToken);
            
            // Retry the original request with the new token
            return protectedFetch<T>(endpoint, options, newToken);
          }
        } catch (error) {
          console.error('Error refreshing CSRF token:', error);
        }
      }
    }

    // Handle HTTP errors
    if (!response.ok) {
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