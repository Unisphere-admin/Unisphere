import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';
import { verifyConversationParticipant } from '@/lib/db/securityUtils';
import { withCsrfProtection } from '@/lib/csrf/server';

async function typingIndicatorHandler(
  req: NextRequest,
  user: AuthUser
): Promise<NextResponse> {
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Parse request body
    const body = await req.json();
    const { conversation_id, is_typing, user_id, display_name } = body;

    // Validate required fields
    if (!conversation_id || typeof is_typing !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that the user is a participant in this conversation
    const accessError = await verifyConversationParticipant(user, conversation_id);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    // Validate that the user_id matches the authenticated user
    if (user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized: Cannot set typing status for another user' 
      }, { status: 403 });
    }

    // Create Supabase client
    const supabase = await createRouteHandlerClientWithCookies();

    // Broadcast the typing event
    const channel = supabase.channel(`tutoring_session:conversation:${conversation_id}`);
    
    await channel.subscribe();
    
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { 
        user_id, 
        conversation_id, 
        is_typing, 
        display_name,
        timestamp: Date.now()
      }
    });
    
    console.log(`Broadcasting typing status: ${user_id} is ${is_typing ? 'typing' : 'not typing'} in conversation ${conversation_id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in typing indicator endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the wrapped route handler
export const POST = withRouteAuth(withCsrfProtection(typingIndicatorHandler)); 