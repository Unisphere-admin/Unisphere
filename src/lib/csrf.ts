import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { AuthUser } from "@/lib/auth/protectResource";

// Constants
const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_FORM_FIELD = "csrfToken";
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Type for token storage
interface TokenData {
  token: string;
  expires: number;
}

/**
 * Generate a secure CSRF token and store it in a cookie
 */
export async function generateCsrfToken(): Promise<string> {
  // Generate a secure random token
  const token = nanoid(TOKEN_LENGTH);
  
  // Set expiration
  const expires = Date.now() + TOKEN_EXPIRY;
  
  // Store token in HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, JSON.stringify({ token, expires }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_EXPIRY / 1000, // Convert to seconds
  });
  
  return token;
}

/**
 * Retrieve and validate the CSRF token from cookies
 */
export async function validateStoredToken(): Promise<{ valid: boolean; token?: string }> {
  try {
    // Get token from cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(CSRF_COOKIE_NAME);
    
    if (!tokenCookie?.value) {
      return { valid: false };
    }
    
    // Parse token data
    const tokenData: TokenData = JSON.parse(tokenCookie.value);
    
    // Check if token has expired
    if (Date.now() > tokenData.expires) {
      return { valid: false };
    }
    
    return { valid: true, token: tokenData.token };
  } catch (error) {
    console.error("CSRF token validation error:", error);
    return { valid: false };
  }
}

/**
 * Clear the CSRF token cookie
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, "", {
    expires: new Date(0),
    path: "/",
  });
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
  
  // Get token from header or request body
  const requestToken = req.headers.get(CSRF_HEADER_NAME);
  
  // If no token in header, try to get from form data
  let formToken: string | null = null;
  
  if (!requestToken) {
    // This is a bit tricky since we can't easily clone the request to read its body
    // without consuming it. In a real implementation, we might need to use a more
    // sophisticated approach.
    console.warn("No CSRF token in header, checking next middleware layer will need to validate form data");
  }
  
  // Validate the stored token
  const { valid, token: storedToken } = await validateStoredToken();
  
  if (!valid || !storedToken) {
    return NextResponse.json(
      { error: "CSRF token missing or expired" },
      { status: 403 }
    );
  }
  
  // Compare tokens (from header first, then form if available)
  const tokenToValidate = requestToken || formToken;
  
  if (!tokenToValidate || tokenToValidate !== storedToken) {
    return NextResponse.json(
      { error: "Invalid CSRF token" },
      { status: 403 }
    );
  }
  
  // If validation passes, return null to continue to the next middleware/handler
  return null;
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 */
export function withCsrfProtection<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    // The first argument should be the request
    const req = args[0] as NextRequest;
    const user = args[1] as AuthUser;
    
    // Apply CSRF middleware
    const csrfResponse = await csrfMiddleware(req, user);
    
    // If CSRF validation fails, throw an error
    if (csrfResponse) {
      throw new Error("CSRF validation failed");
    }
    
    // Otherwise, continue with the handler
    return await handler(...args);
  };
}

/**
 * React hook to get CSRF token for forms
 * This should be used in client components
 */
export function useCsrfToken() {
  const getCsrfToken = async (): Promise<string> => {
    try {
      // Fetch a new token from the server
      const response = await fetch("/api/csrf", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      
      const data = await response.json();
      return data.csrfToken;
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      return "";
    }
  };
  
  return { getCsrfToken };
}

/**
 * Add CSRF token to fetch options
 */
export function addCsrfToken(options: RequestInit = {}, token: string): RequestInit {
  const headers = new Headers(options.headers || {});
  headers.set(CSRF_HEADER_NAME, token);
  
  return {
    ...options,
    headers,
    credentials: "include",
  };
}

/**
 * Get form field name for CSRF token
 */
export function getCsrfFormField(): string {
  return CSRF_FORM_FIELD;
} 