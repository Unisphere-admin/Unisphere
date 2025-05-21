import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr'

// List of public paths
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/tutors',
  '/api/reviews',
  '/',
  '/about',
  '/tutors',
  '/login',
  '/signup',
  '/reset-password'
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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if user is logged in
  await supabase.auth.getUser()

  return response
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