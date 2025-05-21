import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '../db/client';

/**
 * Auth user type for authenticated API routes
 */
export interface AuthUser {
  id: string;
  email: string;
  is_tutor?: boolean;
}

/**
 * Checks if the request is from an authenticated user.
 * Returns the user if authenticated, null otherwise.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.warn('Authentication check failed:', error?.message || 'No user found');
      return null;
    }
    
    return {
      id: user.id,
      email: user.email || '',
      is_tutor: user.user_metadata?.is_tutor === true
    };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return null;
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * @param handler The API handler function that requires authentication
 * @returns A wrapped handler function that checks authentication first
 */
export function withAuth<T extends any[], R>(
  handler: (authUser: AuthUser, ...args: T) => Promise<R>
) {
  return async (authUser: AuthUser | null, ...args: T): Promise<R> => {
    if (!authUser) {
      throw new Error('Authentication required');
    }
    
    return handler(authUser, ...args);
  };
}

/**
 * List of public paths that don't require authentication
 */
export const PUBLIC_PATHS = [
  // API routes
  '/api/auth',
  '/api/tutors',
  '/api/reviews',
  // Public pages
  '/',
  '/about',
  '/tutors',
  '/login',
  '/signup',
  '/reset-password'
];

/**
 * Determines if a route path should be protected
 * Returns true if the path requires authentication
 */
export function shouldProtectRoute(path: string): boolean {
  // Check if the path starts with any of the public paths
  return !PUBLIC_PATHS.some(publicPath => 
    path === publicPath || path.startsWith(publicPath + '/')
  );
}

/**
 * Helper function to check if a path matches a tutor profile page
 */
export function isTutorProfilePath(path: string): boolean {
  return /^\/tutors\/[^\/]+$/.test(path);
}

/**
 * Helper function to check if a path is a static asset
 */
export function isStaticAssetPath(path: string): boolean {
  return (
    path.startsWith('/_next') ||
    path.startsWith('/public') ||
    path.startsWith('/favicon.ico')
  );
}

/**
 * Redirects to login page with a specific query parameter for API requests
 */
export function redirectToLogin(req: NextRequest): NextResponse {
  const isApiRequest = req.nextUrl.pathname.startsWith('/api/');
  if (isApiRequest) {
    return NextResponse.redirect(new URL('/login?apiRedirect=true', req.url));
  } else {
    return NextResponse.redirect(new URL('/login', req.url));
  }
} 