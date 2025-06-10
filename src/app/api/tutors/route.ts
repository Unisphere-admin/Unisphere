import { NextRequest, NextResponse } from 'next/server';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { AuthUser } from '@/lib/auth/protectResource';
import { getAllTutors } from '@/lib/db/tutors';

// Use edge runtime for better performance
export const runtime = 'edge';

// Use dynamic to prevent caching for this authenticated endpoint
export const dynamic = 'force-dynamic';

// Helper function for delayed retry
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to execute query with retries
async function executeQueryWithRetry(queryFn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Add timeout to the query
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10s timeout
            });
            
            // Race between the query and timeout
            const result = await Promise.race([queryFn(), timeoutPromise]);
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
            
            // Exponential backoff with jitter
            if (attempt < maxRetries - 1) {
                const jitter = Math.random() * 300;
                const delayTime = baseDelay * Math.pow(2, attempt) + jitter;
                console.log(`Retrying in ${Math.floor(delayTime)}ms...`);
                await delay(delayTime);
            }
        }
    }
    
    throw lastError;
}

// Handler for public (unauthenticated) access
async function getPublicTutorsHandler(request: NextRequest): Promise<NextResponse> {
    try {
        // For unauthenticated users, pass false to indicate non-premium access
        const { tutors, error } = await getAllTutors(false);
        
        if (error) {
            console.error('Error fetching tutors:', error);
            return NextResponse.json(
                { error },
                { status: 500 }
            );
        }
        
        console.log('Successfully fetched public tutors:', tutors.length);
        
        // Create response with no-cache headers
        const response = NextResponse.json({ tutors });
        
        // Set no-cache headers
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
    } catch (error) {
        console.error('Error in public tutors API route:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Internal server error',
                details: error instanceof Error ? error.stack : undefined,
                hint: 'This may be a temporary network issue, please try again later.'
            },
            { status: 500 }
        );
    }
}

// Wrapped handler with authentication
async function getTutorsHandler(
    request: NextRequest,
    user: AuthUser
): Promise<NextResponse> {
    try {
        // Use the data access layer to get tutors - pass premium access status
        const hasPremiumAccess = user.is_tutor || user.has_access === true;
        const { tutors, error } = await getAllTutors(hasPremiumAccess);
        
        if (error) {
            console.error('Error fetching tutors:', error);
            return NextResponse.json(
                { error },
                { status: 500 }
            );
        }
        
        console.log('Successfully fetched tutors:', tutors.length);
        
        // Create response with no-cache headers to prevent authentication leakage
        const response = NextResponse.json({ tutors });
        
        // Set no-cache headers to prevent authenticated data from being cached
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
    } catch (error) {
        console.error('Error in tutors API route:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Internal server error',
                details: error instanceof Error ? error.stack : undefined,
                hint: 'This may be a temporary network issue, please try again later.'
            },
            { status: 500 }
        );
    }
}

// Combined route handler that works with or without authentication
export async function GET(request: NextRequest) {
    try {
        // Instead of using withRouteAuth as a function, use direct validation
        const { user, errorResponse } = await import('@/lib/auth/validateRequest').then(
            module => module.validateRequest(request)
        );
        
        // If there's an error response and it's an auth error, use public handler
        if (errorResponse && (errorResponse.status === 401 || errorResponse.status === 403)) {
            console.log("User not authenticated, falling back to public tutors data");
            return getPublicTutorsHandler(request);
        }
        
        // If there's a different error, return it
        if (errorResponse) {
            return errorResponse;
        }
        
        // If we have a valid user, use the authenticated handler
        if (user) {
            return getTutorsHandler(request, user);
        }
        
        // Fallback to public handler if something unexpected happened
        return getPublicTutorsHandler(request);
    } catch (error) {
        console.error("Unexpected error in tutors GET route:", error);
        return getPublicTutorsHandler(request);
    }
} 