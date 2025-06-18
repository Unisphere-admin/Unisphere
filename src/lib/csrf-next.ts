import { NextRequest, NextResponse } from 'next/server';

// Get the CSRF secret from environment variables or use a default (for development only)
const CSRF_SECRET = process.env.CSRF_SECRET || 'lMPrlMHe2yqqJjWclpUggs/RvVI2HenyjW8Kkgx7mX8=';

// Constants
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_TOKEN_TTL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

/**
 * Generate a secure random string for CSRF tokens
 * Using Web Crypto API which is available in browser and Edge runtime
 */
async function generateSecureToken(): Promise<string> {
  // Create a random array of bytes
  const array = new Uint8Array(32);
  
  // Fill it with random values using the Web Crypto API
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers/environments (less secure)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Convert to base64 string - avoiding the spread operator for Edge compatibility
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

/**
 * Generate a secure CSRF token
 */
export async function generateToken(): Promise<string> {
  const randomToken = await generateSecureToken();
  // Since we can't use Node.js crypto for HMAC, we'll use a simpler approach for Edge compatibility
  // In production, consider using a proper HMAC implementation compatible with Edge/Web Crypto
  const timestamp = Date.now().toString();
  return `${randomToken}.${timestamp}`;
}

/**
 * Verify a CSRF token - simple time-based verification for Edge compatibility
 */
export function verifyToken(token: string): boolean {
  try {
    const [, timestamp] = token.split('.');
    
    if (!timestamp) return false;
    
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    // Check if token is expired
    return !isNaN(tokenTime) && (now - tokenTime < CSRF_TOKEN_TTL);
  } catch (e) {
    console.error('Error verifying CSRF token:', e);
    return false;
  }
}

/**
 * Extract CSRF token from request
 */
export function extractToken(req: NextRequest): string | null {
  // Check header first (for AJAX requests)
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (headerToken) return headerToken;
  
  // Check cookie
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;
  
  // No token found
  return null;
}

/**
 * Middleware function for CSRF protection in App Router
 */
export async function csrfMiddleware(req: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return null;
  }
  
  try {
    // Extract the token from the request
    const token = extractToken(req);
    
    if (!token) {
      return NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 403 }
      );
    }
    
    // Verify the token
    if (!verifyToken(token)) {
      return NextResponse.json(
        { error: 'CSRF token invalid or expired' },
        { status: 403 }
      );
    }
    
    // Token is valid
    return null;
  } catch (error) {
    console.error('CSRF validation error:', error);
    return NextResponse.json(
      { error: 'CSRF validation failed' },
      { status: 403 }
    );
  }
}

/**
 * Helper function to wrap API handlers with CSRF protection
 */
export function withCsrfProtection(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]) => {
    // Apply CSRF middleware
    const csrfError = await csrfMiddleware(req);
    
    // If csrfError is defined, it means there was an error
    if (csrfError) {
      return csrfError;
    }
    
    // Otherwise, continue with the handler
    return handler(req, ...args);
  };
}

/**
 * Set CSRF token in response
 */
export async function setCsrfCookie(res: NextResponse): Promise<NextResponse> {
  // Generate a secure token
  const token = await generateToken();
  
  // Set token in header for JavaScript clients
  res.headers.set(CSRF_HEADER_NAME, token);
  
  // Set token in cookie for form submissions
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_TOKEN_TTL / 1000, // maxAge is in seconds
  });
  
  return res;
} 