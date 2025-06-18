import { NextRequest, NextResponse } from "next/server";
import { setCsrfCookie } from "@/lib/csrf-next";

// Make sure we never cache this endpoint and bypass middleware
export const dynamic = 'force-dynamic';

/**
 * Public CSRF token endpoint that doesn't require authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Create a response with the CSRF token
    const response = NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString()
    });

    // Set the CSRF cookie and token
    return await setCsrfCookie(response);
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { 
        status: 500,
        headers: {
          // Prevent caching of error responses
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }
} 