import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';

// Set edge runtime for better performance
export const runtime = 'edge';

// Mark conversation as read handler using the withRouteAuth pattern
async function markConversationAsReadHandler(
  req: NextRequest,
  user: AuthUser,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const { id: conversationId } = params;
    
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (error) {
      // Silent catch - body is optional
    }

    // Create the Supabase client
    const supabase = await createRouteHandlerClientWithCookies();
    
    // Update directly using the conversation_id and user_id
    // This is more reliable than using the body participants approach
    const { data, error } = await supabase
      .from('conversation_participant')
      .update({
        last_viewed_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error(`Error marking conversation ${conversationId} as read:`, error);
      
      // Try alternative approach if primary approach fails
      try {
        // This is a fallback mechanism if the first approach fails
        const { data: directData, error: directError } = await supabase.rpc(
          'mark_conversation_read',
          {
            p_conversation_id: conversationId,
            p_user_id: user.id,
          }
        );
          
        if (directError) {
          throw directError;
    }
      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
        return NextResponse.json(
          { error: "Failed to mark conversation as read" }, 
          { status: 500 }
        );
      }
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

// Export the wrapped handler
export const POST = withRouteAuth(markConversationAsReadHandler); 