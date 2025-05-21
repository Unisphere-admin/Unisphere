
import { useState, useEffect } from 'react';
import { useConversationMessages } from './useSupabase';
import { Message, User } from '@/types/supabaseTypes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface EnhancedMessage extends Message {
  sender?: User | null;
}

export function useEnhancedMessages(conversationId: string | undefined) {
  const { messages, loading: messagesLoading, error: messagesError } = useConversationMessages(conversationId);
  const [enhancedMessages, setEnhancedMessages] = useState<EnhancedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (messagesLoading || messagesError || !messages.length) {
      setEnhancedMessages([]);
      setLoading(messagesLoading);
      setError(messagesError);
      return;
    }

    const enhanceMessages = async () => {
      try {
        // Get unique sender IDs
        const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))];
        
        if (senderIds.length === 0) {
          setEnhancedMessages(messages.map(m => ({ ...m, sender: null })));
          setLoading(false);
          return;
        }

        // Fetch all users in one query
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('id', senderIds);

        if (usersError) throw usersError;

        // Map messages with their senders
        const enhanced = messages.map(message => {
          const sender = message.sender_id 
            ? users?.find(user => user.id === message.sender_id) || null 
            : null;
          
          return {
            ...message,
            sender
          };
        });

        setEnhancedMessages(enhanced);
      } catch (err) {
        console.error('Error enhancing messages with user data:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: "Error loading message details",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    enhanceMessages();
  }, [messages, messagesLoading, messagesError, toast]);

  return { messages: enhancedMessages, loading, error };
}
