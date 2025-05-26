import { NextRequest, NextResponse } from "next/server";
import { withRouteAuth } from "@/lib/auth/validateRequest";
import { generateCsrfToken } from "@/lib/csrf/server";
import { AuthUser } from "@/lib/auth/protectResource";

// Make sure we never cache this endpoint
export const dynamic = 'force-dynamic';

// Handler to generate and return a CSRF token
async function csrfTokenHandler(
  req: NextRequest,
  user: AuthUser
): Promise<NextResponse> {
  try {
    // Only logged in users can get a CSRF token
    if (!user || !user.id) {
      console.log('CSRF token request rejected: User not authenticated');
      
      // Return a JSON response with proper headers to prevent HTML redirect
      return new NextResponse(
        JSON.stringify({ error: "Authentication required", status: "unauthenticated" }), 
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
      JSON.stringify({ csrfToken: token, status: "success" }),
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
        message: error instanceof Error ? error.message : 'Unknown error'
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

// Export the handler with auth middleware
export const GET = withRouteAuth(csrfTokenHandler); 