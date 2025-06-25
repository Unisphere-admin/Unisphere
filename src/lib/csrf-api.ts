import { NextRequest, NextResponse } from 'next/server';
import { csrfMiddleware } from '@/lib/csrf-next';
import { AuthUser } from '@/lib/auth/protectResource';

/**
 * Helper function to wrap API routes with CSRF protection
 * @param handler The API handler to protect with CSRF
 */
export function withCsrfProtection<T>(
  handler: (req: NextRequest, ...rest: any[]) => Promise<T>
) {
  return async (req: NextRequest, ...rest: any[]) => {
    try {
      // Apply CSRF protection middleware
      const csrfError = await csrfMiddleware(req);
      
      // If csrfError is defined, it means validation failed
      if (csrfError) {
        return csrfError;
      }
      
      // If validation passes, continue to the handler
      return await handler(req, ...rest);
    } catch (error) {
      
      return NextResponse.json(
        { 
          error: 'Request failed', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Combine withCsrfProtection and authentication check into a single wrapper
 * @param handler API handler that requires both CSRF and authentication
 */
export function withProtectedRoute<T>(
  handler: (req: NextRequest, user: AuthUser, ...rest: any[]) => Promise<T>
) {
  return withCsrfProtection(async (req: NextRequest, ...rest: any[]) => {
    // Get user from context - this should be provided by middleware
    const user = rest[0]?.params?.user as AuthUser | undefined;
    
    if (!user || !user.id) {
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          message: 'You must be logged in to access this resource' 
        },
        { status: 401 }
      );
    }
    
    // Pass the authenticated user to the handler
    return handler(req, user, ...rest);
  });
} 