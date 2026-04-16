import { NextResponse, type NextRequest } from 'next/server';
import {
  getAuthUser,
  shouldProtectRoute,
  requiresPremiumAccess,
  redirectToLogin,
  shouldRedirectToPaywall,
  redirectToPaywall,
  isStaticAssetPath
} from '@/lib/auth/protectResource';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { cookies } from 'next/headers';

// File paths and routes that should be exempt from CSRF checks
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/reset-password',
  '/api/csrf',
  '/favicon.ico',
  '/_next',
];

// Check if a path should be exempt from CSRF protection
function isExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some(path => pathname.startsWith(path));
}

// Paths that should be completely exempt from authentication checks
const AUTH_EXEMPT_PATHS = [
  '/api/csrf',
  '/api/auth/reset-password',
];

// Check if a path should bypass authentication completely
function isAuthExemptPath(pathname: string): boolean {
  return AUTH_EXEMPT_PATHS.some(path => pathname === path || pathname.startsWith(path));
}

// Check if a path is a meeting route
function isMeetingRoute(pathname: string): boolean {
  return pathname.startsWith('/meeting/');
}

// Extract session ID from meeting route
function extractSessionId(pathname: string): string | null {
  const match = pathname.match(/\/meeting\/([^\/]+)/);
  return match ? match[1] : null;
}

// Verify if user can access a specific meeting
async function canAccessMeeting(user: any, sessionId: string): Promise<boolean> {
  try {
    // Create Supabase client
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Query only the fields needed for access checks
    const { data, error } = await supabase
      .from('tutoring_session')
      .select('tutor_id, student_id, status, tutor_ready, student_ready')
      .eq('id', sessionId)
      .single();
      
    if (error || !data) {
      return false;
    }
    
    // Check if user is part of this session
    if (data.tutor_id !== user.id && data.student_id !== user.id) {
      return false;
    }
    
    // Check if session is active - once started, both participants can join
    // regardless of individual ready-state toggles
    if (data.status !== 'started') {
      return false;
    }
    
    
    
    // All checks passed
    return true;
  } catch (error) {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static assets and Next.js internals
  if (isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  // Skip authentication checks for exempt paths
  if (isAuthExemptPath(pathname)) {
    return NextResponse.next();
  }

  // ─── PERFORMANCE FAST-PATH ──────────────────────────────────────────────────
  // getAuthUser() fires two Supabase round-trips (auth.getUser + users table).
  // For truly public pages that need neither auth nor premium checks - e.g. /,
  // /about, /tutors, /login, /signup - we can skip both calls entirely.
  // This is the single biggest TTFB improvement for unauthenticated visitors.
  const isMeeting = isMeetingRoute(pathname);
  const needsAuth = shouldProtectRoute(pathname);
  const needsPremium = requiresPremiumAccess(pathname);

  if (!isMeeting && !needsAuth && !needsPremium) {
    return NextResponse.next();
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Get the authenticated user (only reached for protected/premium/meeting routes)
  const user = await getAuthUser();
  
  // Special handling for meeting routes
  if (isMeetingRoute(pathname)) {
    // User must be authenticated
    if (!user) {
      return redirectToLogin(request);
    }
    
    // Extract session ID from path
    const sessionId = extractSessionId(pathname);
    if (!sessionId) {
      // Invalid meeting URL, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard/messages', request.url));
    }
    
    // Check if user can access this specific meeting
    const canAccess = await canAccessMeeting(user, sessionId);
    if (!canAccess) {
      // User doesn't have permission or session isn't ready
      return NextResponse.redirect(new URL('/dashboard/messages', request.url));
    }
  }
  // For API routes, check authentication
  else if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    // If the route should be protected and user is not authenticated
    if (shouldProtectRoute(pathname) && !user) {
      return redirectToLogin(request);
    }
    
    // If the user should be redirected to paywall
    if (user && shouldRedirectToPaywall(user, pathname)) {
      return redirectToPaywall(request);
    }
  }
  // For non-API routes, check authentication
  else if (shouldProtectRoute(pathname) && !user) {
    return redirectToLogin(request);
  }
  // For authenticated users, check paywall
  else if (user && shouldRedirectToPaywall(user, pathname)) {
    return redirectToPaywall(request);
  }
  
  // User is authenticated or route doesn't require authentication
  const response = NextResponse.next();
  
  // Add cache control headers to prevent caching of authenticated pages
  if (user && !pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  }
  
  return response;
}

// Configure middleware to run on all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 