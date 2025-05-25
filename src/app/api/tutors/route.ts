import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { AuthUser } from '@/lib/auth/protectResource';

export const revalidate = 3600; // Revalidate at most once per hour

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

// Wrapped handler with authentication
async function getTutorsHandler(
    request: NextRequest,
    user: AuthUser
): Promise<NextResponse> {
    try {
        // Check premium access or tutor status
        if (!user.is_tutor && !user.has_access) {
            return NextResponse.json(
                { error: 'Premium access required' },
                { status: 403 }
            );
        }

        const supabase = await createRouteHandlerClientWithCookies();
        
        // Get query parameters
        const url = new URL(request.url);
        const subject = url.searchParams.get('subject');
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        
        // Build query
        let query = supabase
            .from('tutor_profile')
            .select('*')
            .range(offset, offset + limit - 1);
        
        // Add subject filter if provided
        if (subject) {
            query = query.ilike('subjects', `%${subject}%`);
        }
        
        // Execute query with retry
        const queryFn = async () => await query;
        const { data: tutors, error } = await executeQueryWithRetry(queryFn);
        
        if (error) {
            console.error('Error fetching tutors:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }
        
        console.log('Successfully fetched tutors:', tutors.length);
        
        // Add cache control headers (24 hours)
        const response = NextResponse.json({ tutors });
        response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
        
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

// Apply authentication middleware
export const GET = withRouteAuth(getTutorsHandler); 