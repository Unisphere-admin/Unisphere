import { NextRequest, NextResponse } from 'next/server';
import { getUserConversations, createConversation, Conversation, ConversationParticipant } from '@/lib/db/messages';
import { AuthUser } from '@/lib/auth/protectResource';
import { withRouteAuth } from '@/lib/auth/validateRequest';
import { createRouteHandlerClientWithCookies } from '@/lib/db/client';

// Export runtime config to optimize API performance with Edge runtime
export const runtime = 'edge';

interface MessageData {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender_id: string;
}

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
}

interface TutorProfile {
  id: string;
  username: string;
  search_id: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  description: string;
}

interface UserData {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  is_tutor: boolean;
  tutor_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    search_id: string;
    avatar_url: string | null;
    description: string | null;
  } | null;
  student_profile?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface TransformedConversation {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  participants: {
    user_id: string;
    last_viewed_at: string | null;
    user: {
      id: string;
      email: string;
      display_name: string;
      avatar_url: string | null;
      is_student: boolean;
      is_tutor: boolean;
      first_name: string;
      last_name: string;
    };
  }[];
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  };
}

// Helper function to get authenticated user
async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const supabase = await createRouteHandlerClientWithCookies();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error("Auth error in conversations API:", error?.message || "No user found");
      return null;
    }
    
    return {
      id: user.id,
      email: user.email || '',
      is_tutor: user.user_metadata?.is_tutor === true
    };
  } catch (error) {
    console.error("Unexpected error in conversations auth check:", error);
    return null;
  }
}

// GET handler for conversations
async function getConversationsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    // Use data access layer to get user conversations - using the auth user's ID
    // getUserConversations(authUser: AuthUser, userId: string)
    const { conversations, error, authError } = await getUserConversations(user, user.id);

    // Handle authentication error
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    if (error) {
      console.error('API: Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
    
    if (conversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Transform conversations to the expected format - with optimized mapping
    const transformedConversations: TransformedConversation[] = conversations.map(conv => {
      const processedParticipants = (conv.participants || []).map(participant => {
        // Extract user data with proper fallbacks and type assertion
        const userData = (participant.user || {}) as any;
        
        return {
          user_id: participant.user_id,
          last_viewed_at: participant.last_viewed_at || null,
          user: {
            id: userData.id || participant.user_id || 'unknown',
            email: userData.email || '',
            display_name: userData.display_name || userData.email || 'Unknown User',
            avatar_url: userData.avatar_url || null,
            is_student: userData.is_tutor === false,
            is_tutor: userData.is_tutor === true,
            first_name: userData.first_name || '',
            last_name: userData.last_name || ''
          }
        };
      });

      return {
        id: conv.id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        created_by: conv.created_by,
        participants: processedParticipants,
        last_message: conv.last_message
      };
    });

    return NextResponse.json({ conversations: transformedConversations });
  } catch (error) {
    console.error('API: Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST handler for conversations
async function postConversationsHandler(
  req: NextRequest, 
  user: AuthUser
): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    const { participant_id } = body;
   
    if (!participant_id) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    // Use data access layer to create conversation with correct parameters
    // createConversation(authUser: AuthUser, creatorId: string, participantIds: string[])
    const { conversation, error } = await createConversation(user, user.id, [participant_id]);

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

    // Return the new conversation ID
    return NextResponse.json({ 
      conversation_id: conversation.id,
      success: true
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

// Custom wrapper function - keeping for reference
async function withAuthHandler(handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    
    // If not authenticated, return 401
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Continue with handler
    return handler(req, user);
  };
}

// The proper way is:
export async function GET(req: NextRequest) {
  // Get authenticated user
  const user = await getAuthenticatedUser(req);
  
  // If not authenticated, return 401
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Continue with handler
  return getConversationsHandler(req, user);
}

export async function POST(req: NextRequest) {
  // Get authenticated user
  const user = await getAuthenticatedUser(req);
  
  // If not authenticated, return 401
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Continue with handler
  return postConversationsHandler(req, user);
} 