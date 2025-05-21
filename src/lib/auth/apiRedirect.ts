/**
 * Client-side utility to handle API redirects
 * 
 * Usage example: 
 * In your login page component:
 * 
 * ```tsx
 * import { useEffect } from 'react';
 * import { useSearchParams } from 'next/navigation';
 * import { handleApiRedirect } from '@/lib/auth/apiRedirect';
 * 
 * export default function LoginPage() {
 *   const searchParams = useSearchParams();
 *   
 *   useEffect(() => {
 *     // Check if this is a redirect from an API call
 *     handleApiRedirect(searchParams);
 *   }, [searchParams]);
 *   
 *   // Rest of your component...
 * }
 * ```
 */

/**
 * Handles API redirects by showing a notification to the user
 * @param searchParams The search parameters from the URL
 */
export function handleApiRedirect(searchParams: URLSearchParams | null): void {
  if (!searchParams) return;
  
  const isApiRedirect = searchParams.get('apiRedirect') === 'true';
  
  if (isApiRedirect) {
    // Show an alert or toast notification that the API request requires authentication
    // You can replace this with a more sophisticated UI notification
    setTimeout(() => {
      alert('Your session has expired or you need to log in to access this resource.');
    }, 100);
    
    // You could also add code here to save the attempted action and retry after login
    // For example, storing the attempted API endpoint in localStorage
  }
}

/**
 * Saves the current API request to retry after login
 * @param endpoint The API endpoint that was attempted
 * @param method The HTTP method used
 * @param body The request body, if any
 */
export function saveApiRequestForRetry(endpoint: string, method: string, body?: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pendingApiRequest', JSON.stringify({
      endpoint,
      method,
      body,
      timestamp: Date.now()
    }));
  }
}

/**
 * Checks if there's a pending API request to retry
 * Call this after successful login to retry any pending requests
 */
export function retryPendingApiRequest(): void {
  if (typeof window !== 'undefined') {
    const pendingRequestJson = localStorage.getItem('pendingApiRequest');
    
    if (pendingRequestJson) {
      try {
        const pendingRequest = JSON.parse(pendingRequestJson);
        
        // Check if the request is still valid (not too old)
        const isValid = Date.now() - pendingRequest.timestamp < 5 * 60 * 1000; // 5 minutes
        
        if (isValid) {
          // Retry the request
          fetch(pendingRequest.endpoint, {
            method: pendingRequest.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: pendingRequest.body ? JSON.stringify(pendingRequest.body) : undefined
          }).catch(err => console.error('Error retrying pending request:', err));
        }
        
        // Remove the pending request regardless of validity
        localStorage.removeItem('pendingApiRequest');
      } catch (error) {
        console.error('Error parsing pending API request:', error);
        localStorage.removeItem('pendingApiRequest');
      }
    }
  }
} 