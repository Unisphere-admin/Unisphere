import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Set edge runtime for better performance
export const runtime = 'edge';

/**
 * Mark conversation as read
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }
    
    // Create the Supabase client
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Get the authenticated user
    const { data, error: authError } = await supabase.auth.getUser();
    
    if (authError || !data.user) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }
    
    // Update directly using the conversation_id and user_id
    const { error } = await supabase
      .from('conversation_participant')
      .update({
        last_viewed_at: new Date().toISOString(),
      })
      .eq('conversation_id', id)
      .eq('user_id', data.user.id);
    
    if (error) {
      return NextResponse.json(
        { error: "Failed to mark conversation as read" }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in mark read handler:", error);
    return NextResponse.json(
      { error: "Failed to mark conversation as read" }, 
      { status: 500 }
    );
  }
} 