"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";

interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  timestamp: Date;
  read: boolean;
  sessionRequest?: SessionRequest | null;
  created_at?: string;
  conversation_id?: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
}

export interface SessionRequest {
  id: string;
  subject: string;
  date: Date;
  duration: number;
  tokens: number;
  studentReady: boolean;
  tutorReady: boolean;
  status: "pending" | "accepted" | "rejected" | "completed";
}

interface Conversation {
  id: string;
  participants: Array<{
    user_id: string;
    user?: {
      id: string;
      display_name: string;
      first_name?: string;
      last_name?: string;
      avatar_url?: string | null;
      is_tutor: boolean;
    };
  }>;
  last_message?: string;
  last_message_at?: string;
  unreadCount: number;
  // Computed property for easier access in UI
  participant?: {
    id: string;
    display_name: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
    is_tutor: boolean;
  };
}

interface MessageContextType {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string) => void;
  currentConversation: Conversation | null;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  loading: boolean;
  loadingMessages: boolean;
  hasUnreadMessages: (conversationId: string) => boolean;
  setActiveConversation: (id: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Get current conversation
  const currentConversation = selectedConversationId 
    ? conversations.find(conv => conv.id === selectedConversationId) || null 
    : null;
  
  // Load conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        setConversations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/conversations', {
          credentials: 'include' // Include cookies for auth
        });
        
        if (response.status === 401) {
          // User needs to login again
          console.log('Auth session expired or unauthorized. Redirecting to login...');
          setConversations([]);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        
        const data = await response.json();
        
        // Process the conversations to add the participant property
        const processedConversations = data.conversations?.map((convo: Conversation) => {
          // Find the other participant (not the current user)
          const otherParticipant = convo.participants.find(
            p => p.user_id !== user.id
          )?.user;
          
          return {
            ...convo,
            participant: otherParticipant
          };
        }) || [];
        
        setConversations(processedConversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        // Use mock conversations as fallback
        const mockConversations: Conversation[] = [
          {
            id: "conv-1",
            participants: [
              {
                user_id: user.id,
                user: {
                  id: user.id,
                  display_name: user.name,
                  avatar_url: user.profilePic || null,
                  is_tutor: user.role === 'tutor'
                }
              },
              {
                user_id: "tutor-1",
                user: {
                  id: "tutor-1",
                  display_name: "Sarah Johnson",
                  avatar_url: "/placeholder.svg",
                  is_tutor: true
                }
              }
            ],
            last_message: "Hello! I can help with your calculus homework.",
            last_message_at: new Date().toISOString(),
            unreadCount: 1,
            participant: {
              id: "tutor-1",
              display_name: "Sarah Johnson",
              avatar_url: "/placeholder.svg",
              is_tutor: true
            }
          },
          {
            id: "conv-2",
            participants: [
              {
                user_id: user.id,
                user: {
                  id: user.id,
                  display_name: user.name,
                  avatar_url: user.profilePic || null,
                  is_tutor: user.role === 'tutor'
                }
              },
              {
                user_id: "tutor-2",
                user: {
                  id: "tutor-2",
                  display_name: "Michael Chen",
                  avatar_url: "/placeholder.svg",
                  is_tutor: true
                }
              }
            ],
            last_message: "Looking forward to our physics session!",
            last_message_at: new Date(Date.now() - 86400000).toISOString(),
            unreadCount: 0,
            participant: {
              id: "tutor-2",
              display_name: "Michael Chen",
              avatar_url: "/placeholder.svg",
              is_tutor: true
            }
          }
        ];
        setConversations(mockConversations);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Load messages for a conversation
  const getMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/messages?conversation_id=${conversationId}`, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Handle unauthorized
        console.log('Session expired or unauthorized for messages.');
        return;
      }
      
      if (!response.ok) {
        // Log more detailed information for debugging
        const errorText = await response.text();
        console.error(`Failed to fetch messages: Status ${response.status}`, errorText);
        throw new Error(`Failed to fetch messages: Status ${response.status}`);
      }
      
      const data = await response.json();
      
      setMessages(prev => ({
        ...prev,
        [conversationId]: data.messages || []
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      
      // Create mock messages as fallback
      const mockMessages: Message[] = [
        {
          id: "msg-1",
          sender_id: "tutor-1",
          content: "Hello! How can I help with your studies today?",
          timestamp: new Date(Date.now() - 3600000),
          read: true,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          conversation_id: conversationId,
          sender: {
            id: "tutor-1",
            display_name: "Sarah Johnson",
            avatar_url: "/placeholder.svg",
            is_tutor: true
          }
        },
        {
          id: "msg-2",
          sender_id: user.id,
          content: "I'm having trouble with calculus derivatives. Can we schedule a session?",
          timestamp: new Date(Date.now() - 3500000),
          read: true,
          created_at: new Date(Date.now() - 3500000).toISOString(),
          conversation_id: conversationId
        },
        {
          id: "msg-3",
          sender_id: "tutor-1",
          content: "Of course! I'm available tomorrow at 3pm. Does that work for you?",
          timestamp: new Date(Date.now() - 3400000),
          read: false,
          created_at: new Date(Date.now() - 3400000).toISOString(),
          conversation_id: conversationId,
          sender: {
            id: "tutor-1",
            display_name: "Sarah Johnson",
            avatar_url: "/placeholder.svg",
            is_tutor: true
          }
        }
      ];
      
      // Set mock messages in development environments and for demo purposes
      setMessages(prev => ({
        ...prev,
        [conversationId]: mockMessages
      }));
    } finally {
      setLoadingMessages(false);
    }
  }, [user]);
  
  // Automatically load messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      getMessages(selectedConversationId);
    }
  }, [selectedConversationId, getMessages]);

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user) {
      throw new Error("You must be logged in to send messages");
    }
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content
        }),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        throw new Error("Unauthorized. Please login again.");
      }
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const newMessage = await response.json();
      
      // Update messages
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage]
      }));
      
      // Update conversation's last message
    setConversations(prev => 
        prev.map(convo =>
          convo.id === conversationId
            ? { 
                ...convo, 
                last_message: content,
                last_message_at: new Date().toISOString()
              }
            : convo
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add a mock message as fallback for demo purposes
      const mockMessage: Message = {
        id: `mock-${Date.now()}`,
        sender_id: user.id,
        content,
        timestamp: new Date(),
        read: false,
        created_at: new Date().toISOString(),
        conversation_id: conversationId
      };
      
      // Update messages
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), mockMessage]
      }));
      
      // Update conversation's last message
    setConversations(prev => 
        prev.map(convo =>
          convo.id === conversationId
            ? { 
                ...convo, 
                last_message: content,
                last_message_at: new Date().toISOString()
              }
            : convo
        )
      );
      
      throw error;
    }
  }, [user]);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.status === 401) {
        console.log("Unauthorized when marking conversation as read.");
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to mark conversation as read');
      }
      
      // Update unread count
      setConversations(prev =>
        prev.map(convo =>
          convo.id === conversationId
            ? { ...convo, unreadCount: 0 }
            : convo
        )
      );
      
      // Mark messages as read
      setMessages(prev => {
        const convoMessages = prev[conversationId] || [];
        
        return {
          ...prev,
          [conversationId]: convoMessages.map(msg => ({
            ...msg,
            read: true
          }))
        };
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [user]);
  
  // Check if a conversation has unread messages
  const hasUnreadMessages = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    return (conversation?.unreadCount || 0) > 0;
  }, [conversations]);
  
  // Set active conversation - convenience function that aliases setSelectedConversationId
  const setActiveConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, [setSelectedConversationId]);

  return (
    <MessageContext.Provider
      value={{
        conversations,
        messages,
        selectedConversationId,
        setSelectedConversationId,
        currentConversation,
        sendMessage,
        markConversationAsRead,
        loading,
        loadingMessages,
        hasUnreadMessages,
        setActiveConversation
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
};
