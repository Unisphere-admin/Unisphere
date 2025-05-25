import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, requiresPremiumAccess } from './protectResource';
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
    
    // Fetch additional user data from the database
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('is_tutor, tokens, has_access')
      .eq('id', user.id)
      .single();
    
    if (userDataError) {
      console.warn('Error fetching user data:', userDataError);
    }
    
    // Create the user object with all properties
    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      is_tutor: userData?.is_tutor || user.user_metadata?.is_tutor === true,
      tokens: userData?.tokens,
      has_access: userData?.has_access || false
    };
    
    // Check if this path requires premium access
    const path = req.nextUrl.pathname;
    if (requiresPremiumAccess(path) && !authUser.is_tutor && !authUser.has_access) {
      // Path requires premium access but user doesn't have it
      const isApiRequest = path.startsWith('/api/');
      
      if (isApiRequest) {
        return {
          user: authUser,
          errorResponse: NextResponse.json(
            { error: 'Premium access required' }, 
            { status: 403 }
          )
        };
      } else {
        // For page requests, redirect to paywall
        return {
          user: authUser,
          errorResponse: NextResponse.redirect(new URL('/paywall', req.url))
        };
      }
    }
    
    // Otherwise, return the authenticated user with access
    return { 
      user: authUser, 
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
): (req: NextRequest, props: { params: Promise<Params> }) => Promise<NextResponse> {
  return async (req: NextRequest, { params }) => {
    try {
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
      
      // Resolve the params Promise for Next.js 15
      const resolvedParams = await params;
      
      // Call the handler with the authenticated user and resolved params
      return await handler(req, user, resolvedParams);
    } catch (error) {
      // Add better error handling for debugging
      console.error('Error in route handler:', error);
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : String(error);
        
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        },
        { status: 500 }
      );
    }
  };
} 