import { saveApiRequestForRetry } from './apiRedirect';

/**
 * Interface for fetch options with optional body
 */
interface FetchOptions extends RequestInit {
  body?: any;
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
  options: FetchOptions = {}
): Promise<T> {
  // Prepare the options
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Convert body to JSON string if present
  if (options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(endpoint, fetchOptions);

    // Handle redirect response (middleware will redirect to login page)
    if (response.redirected && response.url.includes('/login')) {
      // Save the request for later retry
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