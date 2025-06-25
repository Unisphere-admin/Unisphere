import { NextRequest, NextResponse } from 'next/server';
import { 
  AuthUser, 
  requiresPremiumAccess, 
  getAuthUser, 
  shouldProtectRoute, 
  shouldRedirectToPaywall, 
  redirectToLogin, 
  redirectToPaywall,
  isStaticAssetPath
} from './protectResource';
import { createRouteHandlerClientWithCookies } from '../db/client';
import { csrfMiddleware } from "@/lib/csrf-next";

/**
 * Validates a request to ensure it has a valid authenticated user.
 * Returns the user object and an error response (if any).
 * 
 * @param req The NextRequest object to validate
 * @returns Object containing the user (if authenticated) and errorResponse (if not)
 */
export async function validateRequest(req: NextRequest): Promise<{
  user: AuthUser | null;
  errorResponse: NextResponse | null;
}> {
  try {
    // Check if the route should be protected
    const path = req.nextUrl.pathname;
    
    // Skip protection for static assets
    if (isStaticAssetPath(path)) {
      return { user: null, errorResponse: null };
    }
    
    // First check if the user is authenticated
    let authUser = await getAuthUser();
      
    // Check if this path requires protection
    if (shouldProtectRoute(path)) {
      // Special case for tutor API endpoints - allow without authentication
      if (path.startsWith('/api/tutors/') || path.match(/^\/tutors\/[^\/]+$/)) {
        return { user: null, errorResponse: null };
      }
      
      // If no user is logged in, redirect to login
      if (!authUser) {
        return { user: null, errorResponse: redirectToLogin(req) };
    }
    
      // Check if this path requires premium access
      if (requiresPremiumAccess(path) && shouldRedirectToPaywall(authUser, path)) {
        return { user: null, errorResponse: redirectToPaywall(req) };
      }
    }
    
    // If we have a user and this is not a GET request, validate CSRF token
    // Skip CSRF validation for auth-related endpoints
    if (authUser && req.method !== "GET" && !path.startsWith("/api/auth/") && !path.startsWith("/api/csrf")) {
      // Apply CSRF validation
      const csrfResponse = await csrfMiddleware(req);
      
      // If CSRF validation fails, return the error response
      if (csrfResponse) {
        return { user: authUser, errorResponse: csrfResponse };
      }
    }
    
    // All validations passed
    return { user: authUser, errorResponse: null };
  } catch (error) {
    // Return a generic error response
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication.
 * This provides a convenient way to protect API routes and get the authenticated user.
 * 
 * @param handler The handler function to wrap with authentication
 * @returns A handler function that includes authentication
 */
export function withRouteAuth<Params = Record<string, string>>(
  handler: (req: NextRequest, user: AuthUser, params: Params) => Promise<NextResponse>
): (req: NextRequest, props: { params: Promise<Params> }) => Promise<NextResponse> {
  return async (req: NextRequest, props: { params: Promise<Params> }) => {
    // Validate the request
      const { user, errorResponse } = await validateRequest(req);
      
    // If there's an error response, return it
      if (errorResponse) {
        return errorResponse;
      }
      
    // If no user is returned, it's an unexpected error
      if (!user) {
        return NextResponse.json(
        { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
    try {
      // Otherwise, call the handler with the authenticated user
      const params = await props.params;
      return await handler(req, user, params);
    } catch (error) {
        
      // Return a generic error response
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
} 