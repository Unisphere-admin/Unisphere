import { createRouteHandlerClientWithCookies } from './client';
import { AuthUser, withAuth } from '../auth/protectResource';
import { securityCheck, verifyConversationParticipant, verifyUserPermission } from './securityUtils';

// Define interfaces
export interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  conversation_id: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  participants?: ConversationParticipant[];
  last_message?: Message;
}

export interface ConversationParticipant {
  id: string;
  user_id: string;
  conversation_id: string;
  last_viewed_at?: string;
  user?: {
    email?: string;
    id: string;
    display_name?: string;
    is_tutor?: boolean;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
  };
}

/**
 * Get conversations for a user
 */
async function _getUserConversations(authUser: AuthUser, userId: string): Promise<{
  conversations: Conversation[];
  error: string | null;
  authError?: string | null;
}> {
  try {
    // Security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { conversations: [], error: securityError, authError: securityError };
    }
    
    if (!userId) {
      return { conversations: [], error: 'User ID is required', authError: null };
    }
    
    try {
      // Create an authenticated server client for this request
      const client = await createRouteHandlerClientWithCookies();
      
      // Get all conversations with participants and their user details in a single query
      const { data: participantData, error: participantError } = await client
        .from('conversation_participant')
        .select(`
          id,
          conversation_id,
          last_viewed_at,
          conversation:conversation_id (
            id,
            created_at,
            updated_at,
            created_by
          )
        `)
        .eq('user_id', userId);
        
      if (participantError) {
        return { conversations: [], error: participantError.message, authError: null };
      }
      
      if (!participantData || participantData.length === 0) {
        return { conversations: [], error: null, authError: null };
      }
      
      // Extract conversation IDs
      const conversationIds = participantData.map(p => p.conversation_id);
      
      // Perform parallel queries for better performance
      const [
        allParticipantsResponse, 
        messagesResponse,
        usersResponse,
        studentProfilesResponse,
        tutorProfilesResponse
      ] = await Promise.all([
        // Get all participants for these conversations
        client
        .from('conversation_participant')
        .select(`
          id,
          user_id,
          conversation_id,
          last_viewed_at
        `)
          .in('conversation_id', conversationIds),
        
        // Get most recent message for each conversation
        client
          .from('message')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false }),
      
        // Get current user data
        client
        .from('users')
        .select(`
          id, 
          email,
          is_tutor
        `)
        .eq('id', userId)
          .single(),
      
        // Get student profiles 
        client
        .from('student_profile')
        .select(`
          id,
          first_name,
          last_name
          `),
      
        // Get tutor profiles
        client
        .from('tutor_profile')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url
        `)
      ]);
    
      const { data: allParticipantsData, error: allParticipantsError } = allParticipantsResponse;
      const { data: messagesData, error: messagesError } = messagesResponse;
      const { data: currentUserData, error: currentUserError } = usersResponse;
      const { data: studentProfiles, error: studentProfilesError } = studentProfilesResponse;
      const { data: tutorProfiles, error: tutorProfilesError } = tutorProfilesResponse;
      
      // If any critical query failed, return early
      if (allParticipantsError || !allParticipantsData) {
        return { conversations: [], error: allParticipantsError?.message || 'Failed to fetch participant data', authError: null };
      }
      
      // Extract participant user IDs
      const participantUserIds = Array.from(new Set(allParticipantsData.map(p => p.user_id)));
      
      // Create maps for easy lookup
      const studentProfileMap: Record<string, any> = {};
      studentProfiles?.forEach(profile => {
        studentProfileMap[profile.id] = profile;
      });
      
      const tutorProfileMap: Record<string, any> = {};
      tutorProfiles?.forEach(profile => {
        tutorProfileMap[profile.id] = profile;
      });
      
      // Create a map of user data by ID
      const usersById: Record<string, any> = {};
      
      // Only add the current user's full data
      if (currentUserData) {
        const profile = currentUserData.is_tutor 
          ? tutorProfileMap[currentUserData.id] 
          : studentProfileMap[currentUserData.id];
          
        const firstName = profile?.first_name || '';
        const lastName = profile?.last_name || '';
        const avatarUrl = currentUserData.is_tutor ? profile?.avatar_url || null : null;
        
        const displayName = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : currentUserData.email;
          
        usersById[currentUserData.id] = { 
          id: currentUserData.id, 
          email: currentUserData.email,
          is_tutor: currentUserData.is_tutor,
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl
        };
      }
      
      // For other users, use profile data
      participantUserIds.forEach(id => {
        // Skip if this is the current user (already added)
        if (id === userId) return;
        
        // Try to find a tutor profile first
        const tutorProfile = tutorProfileMap[id];
        if (tutorProfile) {
          usersById[id] = {
            id,
            is_tutor: true,
            display_name: `${tutorProfile.first_name} ${tutorProfile.last_name}`,
            first_name: tutorProfile.first_name,
            last_name: tutorProfile.last_name,
            avatar_url: tutorProfile.avatar_url
          };
          return;
        }
        
        // If not found, check student profile
        const studentProfile = studentProfileMap[id];
        if (studentProfile) {
          usersById[id] = {
            id,
            is_tutor: false,
            display_name: `${studentProfile.first_name} ${studentProfile.last_name}`,
            first_name: studentProfile.first_name,
            last_name: studentProfile.last_name,
            avatar_url: null
          };
          return;
        }
        
        // If no profile is found, use a placeholder
        usersById[id] = { 
          id, 
          display_name: 'Unknown User'
        };
      });
      
      // Group participants by conversation
      const participantsByConversation: Record<string, ConversationParticipant[]> = {};
      allParticipantsData.forEach(participant => {
        if (!participantsByConversation[participant.conversation_id]) {
          participantsByConversation[participant.conversation_id] = [];
        }
        
        // Get user data from our map
        const userData = usersById[participant.user_id];
        
        participantsByConversation[participant.conversation_id].push({
          id: participant.id || '',
          user_id: participant.user_id,
          conversation_id: participant.conversation_id,
          last_viewed_at: participant.last_viewed_at,
          user: userData
        });
      });
      
      // Group messages by conversation - just take the most recent one
      const messagesByConversation: Record<string, Message> = {};
      if (messagesData) {
        messagesData.forEach(message => {
          if (!messagesByConversation[message.conversation_id]) {
            messagesByConversation[message.conversation_id] = message;
          }
        });
      }
      
      // Format conversations with their last message and participants
      const conversations = participantData.map(p => {
        const convo = p.conversation as unknown as Conversation;
        if (!convo) {
          return null;
        }
        
        const lastMessage = messagesByConversation[convo.id];
        const participants = participantsByConversation[convo.id] || [];
        
        return {
          ...convo,
          participants,
          last_message: lastMessage
        };
      }).filter(Boolean) as Conversation[]; // Filter out any null entries
      
      return { conversations, error: null, authError: null };
    } catch (error) {
      console.error("Database query error:", error);
      return { conversations: [], error: 'Failed to fetch conversations from database', authError: null };
    }
  } catch (error) {
    console.error("Error in getUserConversations:", error);
    return { conversations: [], error: 'Error fetching conversations', authError: null };
  }
}

// Export the authenticated version
export const getUserConversations = withAuth(_getUserConversations);

/**
 * Get a single conversation by ID, including participants and messages
 */
async function _getConversationById(authUser: AuthUser, conversationId: string): Promise<{
  conversation: Conversation | null;
  messages: Message[];
  error: string | null;
}> {
  try {
    // Perform basic security checks first
    const securityError = securityCheck(authUser);
    if (securityError) {
      return {
        conversation: null,
        messages: [],
        error: securityError
      };
    }
    
    // Verify that the user is a participant in the conversation
    const participantError = await verifyConversationParticipant(authUser, conversationId);
    if (participantError) {
      return {
        conversation: null,
        messages: [],
        error: participantError
      };
    }
    
    // Create a server client for this request
    const client = await createRouteHandlerClientWithCookies();
    
    // Get conversation details
    const { data: conversationData, error: conversationError } = await client
      .from('conversation')
      .select('*')
      .eq('id', conversationId)
      .single();
      
    if (conversationError) {
      console.error(`Error fetching conversation ${conversationId}:`, conversationError.message);
      return { conversation: null, messages: [], error: 'Conversation not found' };
    }
    
    // Get participants (without user details from users table)
    const { data: participantsData, error: participantsError } = await client
      .from('conversation_participant')
      .select('*')
      .eq('conversation_id', conversationId);
      
    if (participantsError) {
      console.error('Error fetching participants:', participantsError.message);
      return {
        conversation: null,
        messages: [],
        error: 'Failed to fetch conversation participants: ' + participantsError.message
      };
    }
    
    
    // Get current user data from users table (only for authenticated user)
    const { data: currentUserData, error: currentUserError } = await client
      .from('users')
      .select(`
        id, 
        email,
        is_tutor
      `)
      .eq('id', authUser.id)
      .single();
      
    if (currentUserError) {
      console.error('Error fetching current user data:', currentUserError.message);
    }
    
    // Get all user IDs from participants
    const participantUserIds = participantsData?.map(p => p.user_id) || [];
    
    // Double-check: Verify the authenticated user is a participant
    const isParticipant = participantUserIds.includes(authUser.id);
    if (!isParticipant) {
      return { 
        conversation: null, 
        messages: [], 
        error: 'Not authorized to access this conversation' 
      };
    }
    
    // Get student profiles for all participant IDs
    const { data: studentProfiles, error: studentProfilesError } = await client
      .from('student_profile')
      .select(`
        id,
        first_name,
        last_name
      `)
      .in('id', participantUserIds);
      
    if (studentProfilesError) {
      console.error('Error fetching student profiles:', studentProfilesError.message);
      // Continue anyway as some users might be tutors
    }
    
    // Get tutor profiles for all participant IDs
    const { data: tutorProfiles, error: tutorProfilesError } = await client
      .from('tutor_profile')
      .select(`
        id,
        first_name,
        last_name,
        avatar_url
      `)
      .in('id', participantUserIds);
      
    if (tutorProfilesError) {
      console.error('Error fetching tutor profiles:', tutorProfilesError.message);
      // Continue anyway as some users might be students
    }
    
    // Create maps for easy lookup
    const studentProfileMap: Record<string, any> = {};
    studentProfiles?.forEach(profile => {
      studentProfileMap[profile.id] = profile;
    });
    
    const tutorProfileMap: Record<string, any> = {};
    tutorProfiles?.forEach(profile => {
      tutorProfileMap[profile.id] = profile;
    });
    
    // Get messages
    const { data: messagesData, error: messagesError } = await client
      .from('message')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
      
    if (messagesError) {
      console.error('Error fetching messages:', messagesError.message);
      return { 
        conversation: conversationData, 
        messages: [], 
        error: 'Failed to load messages' 
      };
    }
    
    // Process participant data to include proper display names
    const processedParticipants = participantsData?.map(participant => {
      const userId = participant.user_id;
      
      // Special handling for authenticated user
      if (userId === authUser.id && currentUserData) {
        const profile = currentUserData.is_tutor 
          ? tutorProfileMap[userId] 
          : studentProfileMap[userId];
          
        const firstName = profile?.first_name || '';
        const lastName = profile?.last_name || '';
        const avatarUrl = currentUserData.is_tutor ? profile?.avatar_url || null : null;
        
        const displayName = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : currentUserData.email;
          
        return {
          ...participant,
          user: {
            id: userId,
            email: currentUserData.email,
            is_tutor: !!currentUserData.is_tutor,
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            avatar_url: avatarUrl
          }
        };
      }
      
      // For other users, try tutor profile first
      const tutorProfile = tutorProfileMap[userId];
      if (tutorProfile) {
        const firstName = tutorProfile.first_name || '';
        const lastName = tutorProfile.last_name || '';
        const displayName = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : 'Tutor';
          
        return {
          ...participant,
          user: {
            id: userId,
            is_tutor: true,
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            avatar_url: tutorProfile.avatar_url || null
          }
        };
      }
      
      // If not found, check student profile
      const studentProfile = studentProfileMap[userId];
      if (studentProfile) {
        const firstName = studentProfile.first_name || '';
        const lastName = studentProfile.last_name || '';
        const displayName = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : 'Student';
          
        return {
          ...participant,
          user: {
            id: userId,
            is_tutor: false,
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            avatar_url: null
          }
        };
      }
      
      // If no profile found, use placeholder
      return {
        ...participant,
        user: {
          id: userId,
          display_name: 'Unknown User'
        }
      };
    });
    
    const conversation: Conversation = {
      ...conversationData,
      participants: processedParticipants
    };
    
    return { 
      conversation, 
      messages: messagesData || [],
      error: null 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error fetching conversation:', errorMessage);
    return { 
      conversation: null, 
      messages: [], 
      error: errorMessage 
    };
  }
}

// Export the authenticated version
export const getConversationById = withAuth(_getConversationById);

/**
 * Send a new message in a conversation
 */
async function _sendMessage(authUser: AuthUser, conversationId: string, senderId: string, content: string): Promise<{
  message: Message | null;
  error: string | null;
}> {
  try {
    // Security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { message: null, error: securityError };
    }
    
    if (!conversationId || !senderId || !content.trim()) {
      return { 
        message: null, 
        error: 'Conversation ID, sender ID, and content are required' 
      };
    }
    
    // Verify user is the sender
    const permissionError = await verifyUserPermission(authUser, senderId);
    if (permissionError) {
      return { message: null, error: permissionError };
    }
    
    // Verify user is a participant in this conversation
    const participantError = await verifyConversationParticipant(authUser, conversationId);
    if (participantError) {
      return { message: null, error: participantError };
    }
    
    // Create a server client for this request
    const client = await createRouteHandlerClientWithCookies();
    
    // Create the message
    const { data: message, error: messageError } = await client
      .from('message')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content
      })
      .select()
      .single();
      
    if (messageError) {
      console.error('Error sending message:', messageError.message);
      return { message: null, error: 'Failed to send message' };
    }
    
    // Update conversation updated_at timestamp
    await client
      .from('conversation')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
      
    return { message, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error sending message:', errorMessage);
    return { message: null, error: errorMessage };
  }
}

// Export the authenticated version
export const sendMessage = withAuth(_sendMessage);

/**
 * Create a new conversation between users
 */
async function _createConversation(authUser: AuthUser, creatorId: string, participantIds: string[]): Promise<{
  conversation: Conversation | null;
  error: string | null;
}> {
  try {
    // Security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { conversation: null, error: securityError };
    }
    
    if (!creatorId || !participantIds.length) {
      return { 
        conversation: null, 
        error: 'Creator ID and at least one participant are required' 
      };
    }
    
    // Verify creator ID matches authenticated user
    const permissionError = await verifyUserPermission(authUser, creatorId);
    if (permissionError) {
      return { conversation: null, error: permissionError };
    }
    
    // Make sure creator is included in participants
    const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
    
    // Create a server client for this request
    const client = await createRouteHandlerClientWithCookies();
    
    // Start a transaction
    const { data: conversation, error: conversationError } = await client
      .from('conversation')
      .insert({
        created_by: creatorId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (conversationError) {
      console.error('Error creating conversation:', conversationError.message);
      return { conversation: null, error: 'Failed to create conversation' };
    }
    
    // Add participants
    const participantInserts = allParticipantIds.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      last_viewed_at: new Date().toISOString()
    }));
    
    const { error: participantError } = await client
      .from('conversation_participant')
      .insert(participantInserts);
      
    if (participantError) {
      console.error('Error adding participants:', participantError.message);
      return { conversation, error: 'Created conversation but failed to add all participants' };
    }
    
    return { conversation, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error creating conversation:', errorMessage);
    return { conversation: null, error: errorMessage };
  }
}

// Export the authenticated version
export const createConversation = withAuth(_createConversation);

/**
 * Mark a conversation as read for a specific user
 */
async function _markConversationAsRead(authUser: AuthUser, conversationId: string, userId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // Security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { success: false, error: securityError };
    }
    
    if (!conversationId || !userId) {
      return { success: false, error: 'Conversation ID and user ID are required' };
    }
    
    // Verify user ID matches authenticated user
    const permissionError = await verifyUserPermission(authUser, userId);
    if (permissionError) {
      return { success: false, error: permissionError };
    }
    
    // Verify user is a participant in this conversation
    const participantError = await verifyConversationParticipant(authUser, conversationId);
    if (participantError) {
      return { success: false, error: participantError };
    }
    
    
    const client = await createRouteHandlerClientWithCookies();
    
    // First, check if the participant record exists
    const { data: participant, error: checkError } = await client
      .from('conversation_participant')
      .select('id, last_viewed_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();
      
    if (checkError) {
      console.error('Error checking conversation participant:', checkError.message);
      return { success: false, error: checkError.message };
    }
    
    if (!participant) {
      console.error(`No participant record found for user ${userId} in conversation ${conversationId}`);
      return { success: false, error: 'Participant record not found' };
    }
    
    
    // Update the last_viewed_at timestamp for the user in this conversation
    const timestamp = new Date().toISOString();
    const { data: updateData, error } = await client
      .from('conversation_participant')
      .update({ last_viewed_at: timestamp })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .select();
      
      
    if (error) {
      console.error('Error updating conversation last_viewed_at:', error.message);
      return { success: false, error: error.message };
    }
    
    if (!updateData || updateData.length === 0) {
      console.warn('Update succeeded but no rows were updated');
    } else {
    }
    
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error marking conversation as read:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return { success: false, error: errorMessage };
  }
}

// Export the authenticated version
export const markConversationAsRead = withAuth(_markConversationAsRead);

/**
 * Delete a message by ID
 */
async function _deleteMessage(authUser: AuthUser, messageId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // Security check - verify authenticated user
    const securityError = securityCheck(authUser);
    if (securityError) {
      return { success: false, error: securityError };
    }
    
    if (!messageId) {
      return { success: false, error: 'Message ID is required' };
    }
    
    // Create a server client for this request
    const client = await createRouteHandlerClientWithCookies();
    
    // First, get the message to check ownership and related conversation
    const { data: messageData, error: messageError } = await client
      .from('message')
      .select('*')
      .eq('id', messageId)
      .single();
      
    if (messageError) {
      console.error(`Error fetching message ${messageId}:`, messageError.message);
      return { success: false, error: 'Message not found' };
    }
    
    // Verify user has permission to delete this message
    // Users can delete their own messages or messages in conversations they participate in
    if (messageData.sender_id !== authUser.id) {
      // Verify user is a participant in the conversation
      const participantError = await verifyConversationParticipant(authUser, messageData.conversation_id);
      if (participantError) {
        return { success: false, error: 'Not authorized to delete this message' };
      }
    }
    
    // Delete the message
    const { error: deleteError } = await client
      .from('message')
      .delete()
      .eq('id', messageId);
      
    if (deleteError) {
      console.error(`Error deleting message ${messageId}:`, deleteError.message);
      return { success: false, error: 'Failed to delete message' };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error(`Error in deleteMessage:`, error);
    return { success: false, error: 'Error deleting message' };
  }
}

// Export the authenticated version
export const deleteMessage = withAuth(_deleteMessage); 