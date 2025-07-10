import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { AuthUser } from "@/lib/auth/protectResource";

// Constants
export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_FORM_FIELD = "csrfToken";
const TOKEN_LENGTH = 48; // Increased from 32 for more security
const TOKEN_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours (reduced from 24h for security)

// Type for token storage
interface TokenData {
  token: string;
  expires: number;
  userId?: string;
  createdAt: number;
}

/**
 * Generate a secure CSRF token and store it in a cookie
 * THIS FUNCTION MUST ONLY BE CALLED FROM SERVER COMPONENTS OR API ROUTES
 */
export async function generateCsrfToken(userId?: string): Promise<string> {
  try {
    // Generate a secure random token
    const token = nanoid(TOKEN_LENGTH);
    if (!token || token.length !== TOKEN_LENGTH) {
      throw new Error('Failed to generate secure token');
    }
    
    // Set expiration
    const expires = Date.now() + TOKEN_EXPIRY;
    const createdAt = Date.now();
    
    // Create the token data with user association for better security
    const tokenData: TokenData = { token, expires, userId, createdAt };
    const cookieValue = JSON.stringify(tokenData);
    
    // Get cookie store
    const cookieStore = await cookies();
    
    // Store token in HTTP-only cookie with appropriate settings
    cookieStore.set(CSRF_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(TOKEN_EXPIRY / 1000), // Convert to seconds
    });
    
    // Verify that cookie was set by reading it back
    const setCookie = cookieStore.get(CSRF_COOKIE_NAME);
    if (!setCookie || !setCookie.value) {
      throw new Error('Failed to set CSRF cookie');
    }
    
    return token;
  } catch (error) {
    throw error; // Re-throw to let the caller handle it
  }
}

/**
 * Retrieve and validate the CSRF token from cookies
 * THIS FUNCTION MUST ONLY BE CALLED FROM SERVER COMPONENTS OR API ROUTES
 */
export async function validateStoredToken(userId?: string): Promise<{ valid: boolean; token?: string; error?: string }> {
  try {
    // Get token from cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(CSRF_COOKIE_NAME);
    
    if (!tokenCookie?.value) {
      return { valid: false, error: "No CSRF token found in cookies" };
    }
    
    // Parse token data
    let tokenData: TokenData;
    try {
      tokenData = JSON.parse(tokenCookie.value);
    } catch (e) {
      return { valid: false, error: "Invalid CSRF token format" };
    }
    
    // Check if token has expired
    if (Date.now() > tokenData.expires) {
      return { valid: false, error: "CSRF token has expired" };
    }
    
    // If userId is provided, validate that the token belongs to this user
    if (userId && tokenData.userId && tokenData.userId !== userId) {
      return { valid: false, error: "CSRF token user mismatch" };
    }
    
    // Check that token was generated recently enough
    const tokenAge = Date.now() - tokenData.createdAt;
    if (tokenAge > TOKEN_EXPIRY) {
      return { valid: false, error: "CSRF token too old" };
    }
    
    return { valid: true, token: tokenData.token };
  } catch (error) {
    return { valid: false, error: "CSRF validation error" };
  }
}

/**
 * Refresh CSRF token if needed (creates new token if current one is older than threshold)
 * Returns the current token if it's fresh enough, or a new token if needed
 */
export async function refreshCsrfToken(userId?: string, forceRefresh = false): Promise<string> {
  try {
    if (!forceRefresh) {
      // Check if we have a valid token already
      const { valid, token, error } = await validateStoredToken(userId);
      
      // If token is valid and not too old, return it
      if (valid && token) {
        // Get token data to check age
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get(CSRF_COOKIE_NAME);
        if (tokenCookie?.value) {
          try {
            const tokenData: TokenData = JSON.parse(tokenCookie.value);
            const tokenAge = Date.now() - tokenData.createdAt;
            
            // Only refresh if token is more than half its max age
            const REFRESH_THRESHOLD = TOKEN_EXPIRY / 2;
            
            if (tokenAge < REFRESH_THRESHOLD) {
              return token; // Return existing token if it's fresh enough
            }
            
            // Otherwise, fall through to generate a new token
          } catch (e) {
            // If we can't parse token data, just generate a new token
          }
        }
      }
    }
    
    // Generate a new token
    return await generateCsrfToken(userId);
  } catch (error) {
    throw error;
  }
}

/**
 * Clear the CSRF token cookie
 * THIS FUNCTION MUST ONLY BE CALLED FROM SERVER COMPONENTS OR API ROUTES
 */
export async function clearCsrfToken(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    path: "/"
  });
  } catch (error) {
  }
}

/**
 * Middleware to validate CSRF tokens in API requests
 */
export async function csrfMiddleware(
  req: NextRequest,
  user: AuthUser
): Promise<NextResponse | null> {
  // Skip CSRF validation for GET requests (they should be idempotent)
  if (req.method === "GET") {
    return null;
  }
  
  // Skip for authentication routes (they have their own protection)
  if (req.nextUrl.pathname.startsWith("/api/auth/")) {
    return null;
  }
  
  // Skip for the CSRF token endpoint itself
  if (req.nextUrl.pathname === "/api/csrf") {
    return null;
  }
  
  try {
    // Get token from header
  const requestToken = req.headers.get(CSRF_HEADER_NAME);
  
  if (!requestToken) {
    return NextResponse.json(
        { error: "CSRF token missing", details: "No CSRF token provided in request" },
      { status: 403 }
    );
  }
  
    // Validate the stored token using the user ID for additional security
    const { valid, token: storedToken, error } = await validateStoredToken(user?.id);
  
    if (!valid || !storedToken) {
    return NextResponse.json(
        { error: "CSRF token invalid", details: "Authentication token is invalid or expired. Please refresh the page and try again" },
      { status: 403 }
    );
  }
  
    // Compare tokens using constant-time comparison to prevent timing attacks
    if (!constantTimeEqual(requestToken, storedToken)) {
    return NextResponse.json(
        { error: "CSRF token mismatch", details: "Authentication token is invalid. Please refresh the page and try again" },
      { status: 403 }
    );
  }
  
  // If validation passes, return null to continue to the next middleware/handler
  return null;
  } catch (error) {
    return NextResponse.json(
      { error: "CSRF validation error", details: "An error occurred validating your security token. Please refresh the page." },
      { status: 500 }
    );
  }
}

/**
 * Constant-time comparison of strings to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 */
export function withCsrfProtection<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
    // The first argument should be the request
    const req = args[0] as NextRequest;
    const user = args[1] as AuthUser;
    
    // Apply CSRF middleware
    const csrfResponse = await csrfMiddleware(req, user);
    
    // If CSRF validation fails, throw an error
    if (csrfResponse !== null) {
      throw new Error("CSRF validation failed");
    }
    
    // Otherwise, continue with the handler
    return await handler(...args);
    } catch (error) {
      throw error; // Re-throw to let the caller handle it
    }
  };
} 