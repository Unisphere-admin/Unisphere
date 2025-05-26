import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Export runtime config to optimize API performance with Edge runtime
export const runtime = 'edge';

// Force dynamic to ensure status checks are never cached
export const dynamic = 'force-dynamic';

/**
 * Check if a conversation is fully initialized and ready to receive messages
 */
async function checkConversationStatusHandler(
  request: NextRequest, 
  user: AuthUser, 
  params: { id: string }
): Promise<NextResponse> {
  try {
    const conversationId = params.id;
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }
    
    // Create a client for this request
    const supabase = await createRouteHandlerClientWithCookies();
    
    // First verify that the conversation exists and the user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participant')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (participantError) {
      console.error('Error checking conversation participant:', participantError.message);
      return NextResponse.json({ 
        ready: false, 
        error: 'Error checking conversation status' 
      }, { status: 500 });
    }
    
    if (!participantData) {
      // User is not a participant in this conversation
      return NextResponse.json({ 
        ready: false, 
        error: 'Not authorized to access this conversation' 
      }, { status: 403 });
    }
    
    // Now check if the conversation exists and is properly initialized
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversation')
      .select('id, created_at, updated_at')
      .eq('id', conversationId)
      .single();
    
    if (conversationError) {
      console.error('Error checking conversation:', conversationError.message);
      return NextResponse.json({ 
        ready: false,
        error: 'Conversation not found or not fully initialized' 
      }, { status: 404 });
    }
    
    // All checks passed, conversation is ready
    return NextResponse.json({ 
      ready: true,
      conversation: {
        id: conversationData.id,
        created_at: conversationData.created_at,
        updated_at: conversationData.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error checking conversation status:', error);
    return NextResponse.json({ 
      ready: false,
      error: 'Failed to check conversation status' 
    }, { status: 500 });
  }
}

// Use the withRouteAuth pattern for API routes
export const GET = withRouteAuth(checkConversationStatusHandler); 