import { NextRequest, NextResponse } from 'next/server';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { AuthUser } from '@/lib/auth/protectResource';
import { getAllTutors } from '@/lib/db/tutors';

// Use edge runtime for better performance


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
            
            // Exponential backoff with jitter
            if (attempt < maxRetries - 1) {
                const jitter = Math.random() * 300;
                const delayTime = baseDelay * Math.pow(2, attempt) + jitter;
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
            return NextResponse.json(
                { error },
                { status: 500 }
            );
        }
        
        
        // Create response with short-lived cache (30s fresh, serve stale up to 5min while revalidating)
        const response = NextResponse.json({ tutors });

        response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');

        return response;
    } catch (error) {
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
            return NextResponse.json(
                { error },
                { status: 500 }
            );
        }


        // Short-lived private cache for authenticated responses (30s fresh, stale-while-revalidate 5min)
        const response = NextResponse.json({ tutors });

        response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=300');
        
        return response;
    } catch (error) {
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
            return getPublicTutorsHandler(request);
        }
        
        // If there's a different error, return it
        if (errorResponse) {
            return errorResponse;
        }
        
        // If we have a valid user, use the authenticated handler
        // Allow any logged-in user to access tutors, not just premium users
        if (user) {
            return getTutorsHandler(request, user);
        }
        
        // Fallback to public handler if something unexpected happened
        return getPublicTutorsHandler(request);
    } catch (error) {
        return getPublicTutorsHandler(request);
    }
} 