import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { AuthUser } from "@/lib/auth/protectResource";

// Constants
export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_FORM_FIELD = "csrfToken";
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Type for token storage
interface TokenData {
  token: string;
  expires: number;
}

/**
 * Generate a secure CSRF token and store it in a cookie
 * THIS FUNCTION MUST ONLY BE CALLED FROM SERVER COMPONENTS OR API ROUTES
 */
export async function generateCsrfToken(): Promise<string> {
  try {
    // Generate a secure random token
    const token = nanoid(TOKEN_LENGTH);
    if (!token || token.length !== TOKEN_LENGTH) {
      console.error(`CSRF token generation failed: Invalid token length ${token?.length}`);
      throw new Error('Failed to generate secure token');
    }
    
    // Set expiration
    const expires = Date.now() + TOKEN_EXPIRY;
    
    // Create the token data
    const tokenData = { token, expires };
    const cookieValue = JSON.stringify(tokenData);
    
    // Get cookie store
    const cookieStore = await cookies();
    
    // Store token in HTTP-only cookie
    cookieStore.set({
      name: CSRF_COOKIE_NAME,
      value: cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_EXPIRY / 1000, // Convert to seconds
    });
    
    // Verify that cookie was set by reading it back
    const setCookie = cookieStore.get(CSRF_COOKIE_NAME);
    if (!setCookie || !setCookie.value) {
      console.error('CSRF cookie was not set properly');
      throw new Error('Failed to set CSRF cookie');
    }
    
    console.log(`CSRF token generated successfully: ${token.substring(0, 6)}...`);
    return token;
  } catch (error) {
    console.error('Error in generateCsrfToken:', error);
    throw error; // Re-throw to let the caller handle it
  }
}

/**
 * Retrieve and validate the CSRF token from cookies
 * THIS FUNCTION MUST ONLY BE CALLED FROM SERVER COMPONENTS OR API ROUTES
 */
export async function validateStoredToken(): Promise<{ valid: boolean; token?: string }> {
  try {
    // Get token from cookie
    const tokenCookie = (await cookies()).get(CSRF_COOKIE_NAME);
    
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
 * THIS FUNCTION MUST ONLY BE CALLED FROM SERVER COMPONENTS OR API ROUTES
 */
export async function clearCsrfToken(): Promise<void> {
  (await cookies()).set({
    name: CSRF_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    path: "/"
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
  
  // Skip for the CSRF token endpoint itself
  if (req.nextUrl.pathname === "/api/csrf") {
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
    if (csrfResponse !== null) {
      throw new Error("CSRF validation failed");
    }
    
    // Otherwise, continue with the handler
    return await handler(...args);
  };
} 