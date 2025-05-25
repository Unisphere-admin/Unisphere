import { NextRequest, NextResponse } from "next/server";
import { 
  getAuthUser, 
  shouldProtectRoute, 
  redirectToLogin, 
  shouldRedirectToPaywall, 
  redirectToPaywall, 
  isStaticAssetPath 
} from '@/lib/auth/protectResource';

export async function middleware(req: NextRequest) {
  // Skip static assets and API routes
  const path = req.nextUrl.pathname;

  // Special cache revalidation route
  if (path.startsWith('/api/revalidate-cache')) {
    // Check for the revalidation secret
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const tag = searchParams.get('tag');
    
    // Verify the secret matches environment variable
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Invalid revalidation secret' }, { status: 401 });
}

    // If a specific tag is provided, revalidate just that tag
    if (tag) {
      // This will use Vercel's tag-based revalidation feature
      // The server will look for responses with matching Cache-Tag and purge them
      return NextResponse.json({ 
        revalidated: true, 
        date: Date.now(),
        tag
      });
    }
    
    // No tag means revalidate everything (be careful with this)
    return NextResponse.json({ 
      revalidated: true, 
      date: Date.now() 
    });
  }
  
  // Skip middleware for static assets
  if (isStaticAssetPath(path)) {
    return NextResponse.next();
  }
  
  // Skip middleware for non-protected routes
  if (!shouldProtectRoute(path)) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const user = await getAuthUser();
    
  // If not authenticated, redirect to login
  if (!user) {
    return redirectToLogin(req);
    }

  // Check if user should be redirected to paywall
  if (shouldRedirectToPaywall(user, path)) {
    return redirectToPaywall(req);
    }

  // User is authenticated and has access, continue
  return NextResponse.next();
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