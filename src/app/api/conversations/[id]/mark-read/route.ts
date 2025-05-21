import { NextRequest, NextResponse } from 'next/server';
import { markConversationAsRead } from '@/lib/db/messages';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';

async function markConversationAsReadHandler(
  req: NextRequest,
  user: AuthUser,
  params: { id: string }
): Promise<NextResponse> {
  try {
    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Mark the conversation as read using the DAL (with authentication built in)
    const { success, error, authError } = await markConversationAsRead(conversationId, user.id);

    // Handle authentication error
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    if (error) {
      console.error('Error marking conversation as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark conversation as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error in mark-read endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the wrapped route handler
export const POST = withRouteAuth(markConversationAsReadHandler); 