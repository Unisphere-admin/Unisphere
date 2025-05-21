import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

export const revalidate = 3600; // Revalidate at most once per hour

export async function GET(request: NextRequest) {
    try {
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
        
        // Execute query
        const { data: tutors, error } = await query;
        
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
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
} 