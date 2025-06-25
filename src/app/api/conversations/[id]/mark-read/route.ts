import { NextRequest, NextResponse } from 'next/server';
import { markConversationAsRead } from '@/lib/db/messages';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { withCsrfProtection } from '@/lib/csrf-next';

// Set edge runtime for better performance
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Mark conversation as read
 */
async function markReadHandler(
  request: NextRequest, 
  user: AuthUser, 
  params: { id: string }
): Promise<NextResponse> {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    // Use the data access layer to mark conversation as read
    const { success, error } = await markConversationAsRead(user, id, user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to mark conversation as read" }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to mark conversation as read" }, 
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const POST = withRouteAuth(withCsrfProtection(markReadHandler));