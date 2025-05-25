import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '../db/client';

/**
 * Auth user type for authenticated API routes
 */
export interface AuthUser {
  id: string;
  email: string;
  is_tutor?: boolean;
  tokens?: number;
  has_access?: boolean;
}

/**
 * Checks if the request is from an authenticated user.
 * Returns the user if authenticated, null otherwise.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Add extra error handling and debug logging
    if (!supabase) {
      console.error('Failed to create Supabase client');
      return null;
    }
    
    // Check if the auth API is accessible
    if (!supabase.auth) {
      console.error('Supabase auth API not accessible');
      return null;
    }
    
    // Check for authenticated session
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('Authentication check failed:', error.message);
      return null;
    }
    
    if (!user) {
      console.warn('No user found in authentication check');
      return null;
    }
    
    // Fetch user data including has_access flag from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_tutor, tokens, has_access')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.warn('Error fetching user data:', userError.message);
    }
    
    return {
      id: user.id,
      email: user.email || '',
      is_tutor: userData?.is_tutor || user.user_metadata?.is_tutor === true,
      tokens: userData?.tokens,
      has_access: userData?.has_access || false
    };
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? `${error.message}\n${error.stack || ''}` 
      : String(error);
    console.error('Unexpected error checking authentication:', errorDetails);
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
    
    try {
      return await handler(authUser, ...args);
    } catch (error) {
      console.error('Error in authenticated handler:', error);
      throw error;
    }
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
  '/reset-password',
  '/paywall'
];

/**
 * List of paths that require premium access
 */
export const PREMIUM_PATHS = [
  '/dashboard',
  '/dashboard/',
  '/tutors',
  '/tutors/',
  '/session',
  '/api/conversations',
  '/api/messages',
  '/api/tutoring-sessions',
  '/api/users',
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
 * Determines if a path requires premium access
 */
export function requiresPremiumAccess(path: string): boolean {
  return PREMIUM_PATHS.some(premiumPath => 
    path === premiumPath || path.startsWith(premiumPath + '/')
  );
}

/**
 * Check if the user should be redirected to the paywall
 */
export function shouldRedirectToPaywall(user: AuthUser | null, path: string): boolean {
  // If it's not a premium path, don't redirect
  if (!requiresPremiumAccess(path)) {
    return false;
  }
  
  // If user is a tutor, don't redirect
  if (user?.is_tutor) {
    return false;
  }
  
  // If user has access, don't redirect
  if (user?.has_access) {
    return false;
  }
  
  // Otherwise, redirect to paywall
  return true;
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

/**
 * Redirects to paywall page
 */
export function redirectToPaywall(req: NextRequest): NextResponse {
  const isApiRequest = req.nextUrl.pathname.startsWith('/api/');
  if (isApiRequest) {
    return NextResponse.json({ error: 'Premium access required' }, { status: 403 });
  } else {
    return NextResponse.redirect(new URL('/paywall', req.url));
  }
} 