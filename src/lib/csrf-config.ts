import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

/**
 * CSRF protection configuration
 * Using custom implementation for robust security
 */

// Generate a secret once that will be used to validate tokens
let secret: string | null = null;

/**
 * Get or generate a CSRF secret
 * For a real application, this should be persisted in a database or cache
 * and associated with the user's session
 */
export function getSecret(): string {
  if (!secret) {
    // Check for environment variable first
    const envSecret = process.env.CSRF_SECRET;
    
    if (envSecret) {
      // Use the environment variable if available
      secret = envSecret;
    } else {
      // Fall back to a generated secret (not recommended for production)
      secret = crypto.randomBytes(32).toString('base64');
      console.warn('CSRF_SECRET environment variable not found. Using generated secret. This is not recommended for production.');
    }
  }
  
  // At this point, secret is guaranteed to be a string
  return secret as string;
}

/**
 * Generate a new CSRF token
 */
export function generateToken(): string {
  const secret = getSecret();
  // Create a random token
  const randomBytes = crypto.randomBytes(32).toString('base64');
  // Create HMAC using the secret
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(randomBytes);
  // Return the token as base64
  return `${randomBytes}.${hmac.digest('base64')}`;
}

/**
 * Verify a CSRF token
 * @param token Token to verify
 * @returns True if valid, false otherwise
 */
export function verifyToken(token: string): boolean {
  try {
    const secret = getSecret();
    
    // Split the token into parts
    const [randomBytes, hmacSignature] = token.split('.');
    
    if (!randomBytes || !hmacSignature) {
      return false;
    }
    
    // Recreate the HMAC
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(randomBytes);
    const expectedSignature = hmac.digest('base64');
    
    // Compare signatures using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(hmacSignature),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Set a CSRF token in response headers and cookies
 * @param res NextResponse object
 * @returns NextResponse with CSRF token
 */
export function setCsrfCookie(res: NextResponse): NextResponse {
  const token = generateToken();
  
  // Set token in header for JavaScript clients
  res.headers.set('X-CSRF-Token', token);
  
  // Set token in cookie for form submissions
  res.cookies.set('csrf-token', token, {
    httpOnly: true,           // Prevent JavaScript access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',          // Reasonable protection, allows links to bring cookies
    path: '/',                // Available across the site
    maxAge: 60 * 60 * 2,      // 2 hours
  });
  
  return res;
}

/**
 * Extract CSRF token from request
 * Checks in this order:
 * 1. X-CSRF-Token header
 * 2. Form field with name _csrf
 * 3. Query parameter _csrf
 */
export async function extractCsrfToken(req: NextRequest): Promise<string | null> {
  // Check header first (for AJAX requests)
  const headerToken = req.headers.get('X-CSRF-Token');
  if (headerToken) return headerToken;
  
  // Check body if it's a form submission
  try {
    if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      const formToken = formData.get('_csrf');
      if (formToken && typeof formToken === 'string') return formToken;
    }
    
    // Check body if it's JSON
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json();
      if (body?._csrf && typeof body._csrf === 'string') return body._csrf;
      if (body?.csrfToken && typeof body.csrfToken === 'string') return body.csrfToken;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // Check URL params
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('_csrf');
  if (queryToken) return queryToken;
  
  // No token found
  return null;
}

/**
 * CSRF protection middleware
 */
export async function csrfMiddleware(req: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return null;
  }
  
  // Extract the token
  const token = await extractCsrfToken(req);
  if (!token) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }
  
  // Verify the token
  if (!verifyToken(token)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }
  
  // Token is valid
  return null;
}

/**
 * Helper function to wrap API handlers with CSRF protection
 * @param handler The API handler to protect
 * @returns The protected handler
 */
export function withCsrfProtection(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]) => {
    // Apply CSRF middleware
    const csrfResult = await csrfMiddleware(req);
    
    // If csrfResult is defined, it means there was an error
    if (csrfResult) {
      return csrfResult;
    }
    
    // Otherwise, continue with the handler
    return handler(req, ...args);
  };
} 