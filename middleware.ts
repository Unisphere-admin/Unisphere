import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr'

// List of public paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth',
  
  '/',
  '/about',
  
  '/login',
  '/signup',
  '/reset-password',
  '/paywall'
];

// Paths that require premium access (subscription)
const PREMIUM_PATHS = [
  '/tutors',
  '/api/tutors',
  '/api/reviews',
  '/dashboard',
  '/session',
  '/api/conversations',
  '/api/messages',
  '/api/tutoring-sessions',
  '/api/users',
];

// Paths to redirect to dashboard if already authenticated
const AUTH_REDIRECT_PATHS = [
  '/login',
  '/signup'
];

// Helper function for tutor profile patterns
function isTutorProfilePath(path: string): boolean {
  return /^\/tutors\/[^\/]+$/.test(path);
}

// Helper function for static assets
function isStaticAssetPath(path: string): boolean {
  return (
    path.startsWith('/_next') ||
    path.startsWith('/public') ||
    path.startsWith('/favicon.ico')
  );
}

// Helper to check if a path is public
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath)) || 
         isStaticAssetPath(path);
}

// Helper to check if a path requires premium access
function requiresPremiumAccess(path: string): boolean {
  // Check individual tutor profiles
  if (isTutorProfilePath(path)) {
    return true;
  }
  
  // Check other premium paths
  return PREMIUM_PATHS.some(premiumPath => 
    path.startsWith(premiumPath)
  );
}

export async function middleware(request: NextRequest) {
  // Extract the path from the URL
  const path = request.nextUrl.pathname;
  
  // Get the current URL to use in redirects
  const currentUrl = new URL(request.url);
  
  // Prevent auth check loops - if URL contains noauth parameter, skip auth check
  if (currentUrl.searchParams.has('noauth')) {
    return NextResponse.next();
  }
  
  // Skip middleware processing for static assets and image optimization
  if (path.includes('.') || path.startsWith('/_next/image') || path.includes('favicon')) {
    return NextResponse.next();
  }

  // Create a response object that we'll modify as needed
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client for auth checking
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.delete(name);
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // Also delete from response
          response.cookies.delete(name);
        },
      },
    }
  );

  try {
    // Get user session - this checks auth status
    // Use refreshSession to ensure tokens are fresh
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // If session exists but might be expiring soon, refresh it
    if (sessionData?.session && sessionData.session.expires_at) {
      const expiresAt = new Date(sessionData.session.expires_at * 1000);
      const now = new Date();
      const timeLeft = expiresAt.getTime() - now.getTime();
      
      // If less than 10 minutes left before token expires, refresh it
      if (timeLeft < 10 * 60 * 1000) {
        await supabase.auth.refreshSession();
      }
    }
    
    // Get user after possible refresh
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // If user is logged in and tries to access login/signup pages, redirect to dashboard
    if (user && AUTH_REDIRECT_PATHS.some(authPath => path.startsWith(authPath))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // If path requires authentication and user is not logged in, redirect to login
    if (!user && !isPublicPath(path)) {
      // Store the original URL to redirect back after login
      const redirectTo = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?redirectTo=${redirectTo}`, request.url));
    }

    // If user is logged in, check for premium access requirements
    if (user && requiresPremiumAccess(path)) {
      // Fetch user data to check if they have access or are a tutor
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_tutor, has_access')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        // Don't redirect on errors - better to let user access than block incorrectly
        return response;
      }
      
      const isTutor = userData?.is_tutor || user.user_metadata?.is_tutor === true;
      const hasAccess = userData?.has_access === true;
      
      // Add debug logging to help troubleshoot premium access issues
      console.log(`User ${user.id} premium check: isTutor=${isTutor}, hasAccess=${hasAccess}, path=${path}`);
      
      // If not a tutor and doesn't have access, redirect to paywall
      if (!isTutor && !hasAccess && path !== '/paywall') {
        // For API requests, return 403 Forbidden
        if (path.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Premium access required' }, 
            { status: 403 }
          );
        }
        
        // For page requests, redirect to paywall
        return NextResponse.redirect(new URL('/paywall', request.url));
      }
    }

    // User is authenticated and has proper access, let them through
    return response;
  } catch (error) {
    console.error('Auth check error in middleware:', error);
    
    // On auth check error, for protected routes, redirect to login as a fallback
    // But add a ?noauth=true parameter to prevent redirect loops
    if (!isPublicPath(path)) {
      const redirectTo = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?redirectTo=${redirectTo}&noauth=true`, request.url));
    }
    
    return response;
  }
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