import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from './protectResource';
import { createRouteHandlerClientWithCookies } from '../db/client';

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
    // Get supabase client with cookie management
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Check for authenticated session
    const { data: { user }, error } = await supabase.auth.getUser();

    // If there's no user, return an appropriate error response
    if (error || !user) {
      const errorMessage = error?.message || 'Authentication required';
      
      // Determine if this is an API request or a page request
      const isApiRequest = req.nextUrl.pathname.startsWith('/api/');
      
      if (isApiRequest) {
        return {
          user: null,
          errorResponse: NextResponse.json(
            { error: errorMessage }, 
            { status: 401 }
          )
        };
      } else {
        // For page requests, redirect to login
        return {
          user: null,
          errorResponse: NextResponse.redirect(new URL('/login', req.url))
        };
      }
    }
    
    // Otherwise, return the authenticated user
    return { 
      user: {
        id: user.id,
        email: user.email || '',
        is_tutor: user.user_metadata?.is_tutor === true
      }, 
      errorResponse: null 
    };
  } catch (error) {
    // For unexpected errors, return a generic error response
    console.error('Authentication validation error:', error);
    
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Authentication error' }, 
        { status: 401 }
      )
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
): (req: NextRequest, { params }: { params: Params }) => Promise<NextResponse> {
  return async (req: NextRequest, { params }) => {
    const { user, errorResponse } = await validateRequest(req);
    
    if (errorResponse) {
      return errorResponse;
    }
    
    // If we get here, we have a valid user
    if (!user) {
      return NextResponse.json(
        { error: 'Unexpected authentication error' }, 
        { status: 401 }
      );
    }
    
    // Call the handler with the authenticated user
    return handler(req, user, params);
  };
} 