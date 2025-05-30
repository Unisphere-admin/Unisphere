import { NextRequest, NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf/server";
import { getAuthUser } from "@/lib/auth/protectResource";

// Make sure we never cache this endpoint
export const dynamic = 'force-dynamic';

/**
 * Special CSRF token handler that does not redirect to login page
 * This ensures client-side code can parse the JSON response properly
 */
export async function GET(req: NextRequest) {
  try {
    // Try to get the authenticated user, but don't redirect if not logged in
    const user = await getAuthUser();
    
    // If not authenticated, return a proper JSON response
    if (!user || !user.id) {
      console.log('CSRF token request from unauthenticated user');
      
      // Return a JSON response with proper headers
      return new NextResponse(
        JSON.stringify({ 
          error: "Authentication required", 
          status: "unauthenticated",
          authenticated: false
        }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            // Prevent caching of this response
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }
    
    // Generate a new CSRF token and set cookie
    console.log(`Generating CSRF token for user ${user.id}`);
    const token = await generateCsrfToken();
    
    if (!token) {
      throw new Error('Failed to generate CSRF token - token is empty');
    }
    
    // Return the token to the client
    return new NextResponse(
      JSON.stringify({ 
        token: token, 
        csrfToken: token, 
        status: "success",
        authenticated: true
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Prevent caching of this response
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to generate CSRF token", 
        status: "error",
        message: error instanceof Error ? error.message : 'Unknown error',
        authenticated: false
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          // Prevent caching of error responses
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
} 