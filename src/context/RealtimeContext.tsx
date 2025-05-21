import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Message } from '@/types/conversation';
import { getFromCache, saveToCache, CACHE_CONFIG } from '@/lib/caching';

// Define TutoringSession type
interface TutoringSession {
  id: string;
  created_at: string;
  updated_at: string;
  conversation_id: string;
  message_id: string;
  tutor_id: string;
  student_id: string;
  status: 'requested' | 'accepted' | 'started' | 'ended' | 'cancelled';
  tutor_ready: boolean;
  student_ready: boolean;
  started_at: string | null;
  ended_at: string | null;
}

interface RealtimeContextType {
  sendMessage: (conversationId: string, message: Message) => Promise<void>;
  messages: Record<string, Message[]>;
  updateMessages: (conversationId: string, messages: Message[]) => void;
  isTyping: Record<string, Set<string>>;
  setTyping: (conversationId: string, typingStatus: string | null) => void;
  subscribeToNewConversation: (conversationId: string) => Promise<void>;
  subscribeToBroadcast: (event: string, callback: () => void) => () => void;
  // Add tutoring session related functionality
  tutoringSessions: Record<string, TutoringSession[]>;
  activeTutoringSessions: Record<string, TutoringSession | null>;
  tutoringSessionsByMessage: Record<string, TutoringSession>;
  broadcastSessionUpdate: (session: TutoringSession) => Promise<void>;
}

export const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<Record<string, RealtimeChannel>>({});
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState<Record<string, Set<string>>>({});
  // Add state for tutoring sessions
  const [tutoringSessions, setTutoringSessions] = useState<Record<string, TutoringSession[]>>({});
  const [activeTutoringSessions, setActiveTutoringSessions] = useState<Record<string, TutoringSession | null>>({});
  const [tutoringSessionsByMessage, setTutoringSessionsByMessage] = useState<Record<string, TutoringSession>>({});
  
  const typingTimeouts = useRef<Record<string, Record<string, NodeJS.Timeout>>>({});
  const supabase = createClientComponentClient();
  const broadcastSubscriptions = useRef<Record<string, Set<() => void>>>({});
  const isMounted = useRef(true);
  const lastBroadcastTime = useRef<Record<string, number>>({});
  const pendingSubscriptions = useRef<Record<string, boolean>>({});
  const lastApiCallTime = useRef<Record<string, number>>({});
  const sessionUpdateQueue = useRef<Record<string, NodeJS.Timeout>>({});

  // Define the broadcast function early so it can be used in other callbacks
  const broadcast = useCallback((event: string) => {
    if (!isMounted.current) return;
    broadcastSubscriptions.current[event]?.forEach(callback => callback());
  }, []);

  // Function to update messages for a conversation
  const updateMessages = useCallback((conversationId: string, newMessages: Message[]) => {
    if (!isMounted.current) return;
    
    setMessages(prev => {
      const updatedMessages = {
        ...prev,
        [conversationId]: newMessages
      };
      
      // Also update cache
      const cacheKey = `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${conversationId}`;
      saveToCache(cacheKey, newMessages);
      
      return updatedMessages;
    });
  }, []);

  // Function to clear typing state for a user
  const clearTypingState = useCallback(async (conversationId: string, userId: string) => {
    if (!isMounted.current) return;

    // Clear the timeout
    if (typingTimeouts.current[conversationId]?.[userId]) {
      clearTimeout(typingTimeouts.current[conversationId][userId]);
      delete typingTimeouts.current[conversationId][userId];
    }

    // Update typing state
    setIsTyping(prev => {
      const newTyping = { ...prev };
      if (newTyping[conversationId]) {
        newTyping[conversationId].delete(userId);
        // If no one is typing anymore, remove the conversation entry
        if (newTyping[conversationId].size === 0) {
          delete newTyping[conversationId];
        }
      }
      return newTyping;
    });

    // Broadcast typing end through channel
    const channel = channels[conversationId];
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: null, stoppedTypingUserId: userId }
      });
    }
  }, [channels]);

  // Function to set typing status
  const setTyping = useCallback(async (conversationId: string, typingStatus: string | null) => {
    if (!isMounted.current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Initialize typing timeouts for this conversation if not exists
    if (!typingTimeouts.current[conversationId]) {
      typingTimeouts.current[conversationId] = {};
    }

    // Clear existing timeout for this user if exists
    if (typingTimeouts.current[conversationId][user.id]) {
      clearTimeout(typingTimeouts.current[conversationId][user.id]);
      delete typingTimeouts.current[conversationId][user.id];
    }

    if (typingStatus) {
      // Broadcast typing status through channel
      const channel = channels[conversationId];
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user.id }
        });
      }

      // Set new timeout for this user
      typingTimeouts.current[conversationId][user.id] = setTimeout(() => {
        clearTypingState(conversationId, user.id);
      }, 3000);
    } else {
      // If typingStatus is null, clear typing state for the current user
      clearTypingState(conversationId, user.id);
    }
  }, [channels, clearTypingState]);

  // Channel subscription handler for typing events
  const handleTypingEvent = useCallback(async ({ payload }: any, conversationId: string) => {
    if (!isMounted.current) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (payload.userId) {
      // User started typing
      if (payload.userId !== user.id) { // Don't show own typing indicator
        setIsTyping(prev => {
          const newTyping = { ...prev };
          if (!newTyping[conversationId]) {
            newTyping[conversationId] = new Set();
          }
          newTyping[conversationId].add(payload.userId);
          return newTyping;
        });

        // Set timeout to clear typing state
        if (!typingTimeouts.current[conversationId]) {
          typingTimeouts.current[conversationId] = {};
        }
        if (typingTimeouts.current[conversationId][payload.userId]) {
          clearTimeout(typingTimeouts.current[conversationId][payload.userId]);
        }
        typingTimeouts.current[conversationId][payload.userId] = setTimeout(() => {
          clearTypingState(conversationId, payload.userId);
        }, 3000);
      }
    } else if (payload.stoppedTypingUserId) {
      // User stopped typing
      if (payload.stoppedTypingUserId !== user.id) { // Don't handle own typing end
        clearTypingState(conversationId, payload.stoppedTypingUserId);
      }
    }
  }, [clearTypingState]);

  // Add a cleanup function to remove old sessions
  const cleanupStaleSessions = useCallback((conversationId: string) => {
    if (!isMounted.current) return;
    
    setTutoringSessions(prev => {
      const currentSessions = [...(prev[conversationId] || [])];
      
      // KEEP ALL sessions by default - commenting out the cleanup logic
      // Instead of removing, we'll just log that we found some old sessions but kept them
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      // Count old sessions but don't remove them
      const oldSessions = currentSessions.filter(session => {
        if (['cancelled', 'ended'].includes(session.status)) {
        const updatedTime = new Date(session.updated_at).getTime();
          return updatedTime <= oneHourAgo;
        }
        return false;
      });
      
      if (oldSessions.length > 0) {
        console.log(`Found ${oldSessions.length} historical sessions - keeping all for display purposes`);
          }
      
      // Keep all sessions - don't filter anything out
      return prev;
    });
  }, [isMounted]);

  // Function to handle tutoring sessions for a conversation
  const loadTutoringSessions = useCallback(async (conversationId: string) => {
    try {
      if (!conversationId || !isMounted.current) return;
      
      // Clean up stale sessions first
      cleanupStaleSessions(conversationId);
      
      // Use debouncing to prevent too many calls in quick succession
      const now = Date.now();
      const lastCall = lastApiCallTime.current[`tutoring_sessions_${conversationId}`];
      
      // Only allow a new API call if it's been at least 3 seconds since the last one
      // unless it's the first call for this conversation
      if (lastCall && (now - lastCall < 3000)) {
        console.log(`Skipping loadTutoringSessions for ${conversationId} - called too recently`);
        return;
      }
      
      // Update the last call time
      lastApiCallTime.current[`tutoring_sessions_${conversationId}`] = now;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found when loading sessions');
        return;
      }

      console.log(`Loading tutoring sessions for conversation: ${conversationId}`);
      
      // Get conversation participants to ensure we only show relevant sessions
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participant')
        .select('user_id')
        .eq('conversation_id', conversationId);
        
      if (participantsError || !participants) {
        console.error('Failed to fetch conversation participants:', participantsError);
        return;
      }
      
      // Create a set of participant IDs for this conversation
      const conversationParticipantIds = new Set(participants.map(p => p.user_id));
      
      // Fetch tutoring sessions from the API
      const response = await fetch(`/api/tutoring-sessions?conversation_id=${conversationId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch tutoring sessions:', response.statusText);
        return;
      }
      
      const data = await response.json();
      const allSessions = data.sessions || [];
      
      // First filter by conversation_id, then by participants
      const sessions = allSessions.filter((session: TutoringSession) => 
        session.conversation_id === conversationId &&
        conversationParticipantIds.has(session.student_id) && 
        conversationParticipantIds.has(session.tutor_id)
      );
      
      console.log(`Found ${sessions.length} matching tutoring sessions for conversation ${conversationId} (filtered from ${allSessions.length} total)`, sessions);
      
      // Create a map of message_id to tutoring session
      // If multiple sessions exist for the same message_id, prioritize active sessions
      const sessionsMap: Record<string, TutoringSession> = {};
      
      // Group sessions by message_id
      const sessionsByMessage: Record<string, TutoringSession[]> = {};
      sessions.forEach((session: TutoringSession) => {
        if (!sessionsByMessage[session.message_id]) {
          sessionsByMessage[session.message_id] = [];
        }
        sessionsByMessage[session.message_id].push(session);
      });
      
      // For each message_id, pick the appropriate session (prioritize active ones)
      Object.entries(sessionsByMessage).forEach(([messageId, messageSessions]) => {
        // Sort sessions: active first, then by most recent
        messageSessions.sort((a, b) => {
          // Active sessions (requested, accepted, started) have priority
          const aActive = ['requested', 'accepted', 'started'].includes(a.status);
          const bActive = ['requested', 'accepted', 'started'].includes(b.status);
          
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          
          // If both have same active status, sort by most recent
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        
        // Use the highest priority session for this message
        const bestSession = messageSessions[0];
        console.log(`Mapping message ${messageId} to session ${bestSession.id} (status: ${bestSession.status})`);
        sessionsMap[messageId] = bestSession;
      });
      
      // Properly prioritize sessions to determine which one should be active
      // Step 1: Find all active sessions (requested, accepted, started)
      const activeOnlySessions = sessions.filter(
        (s: TutoringSession) => s.status === 'requested' || s.status === 'accepted' || s.status === 'started'
      );
      
      // Step 2: Set the active session (most recent one if multiple active exist)
      let activeSession: TutoringSession | null = null;
      if (activeOnlySessions.length > 0) {
        // Sort by updated_at descending to get the most recently updated active session
        activeOnlySessions.sort((a: TutoringSession, b: TutoringSession) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        activeSession = activeOnlySessions[0];
        console.log('Set active session (from active only):', activeSession);
      } else {
        // If no active sessions exist, check if there's a recently cancelled/ended one to show temporarily
        const recentlyChangedSessions = sessions.filter(
          (s: TutoringSession) => {
            if (s.status === 'cancelled' || s.status === 'ended') {
              const updatedTime = new Date(s.updated_at).getTime();
              const now = Date.now();
              const thirtySecondsAgo = now - 30 * 1000; // Only show for 30 seconds
              return updatedTime > thirtySecondsAgo;
            }
            return false;
          }
        );
        
        if (recentlyChangedSessions.length > 0) {
          // Sort by updated_at descending
          recentlyChangedSessions.sort((a: TutoringSession, b: TutoringSession) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          activeSession = recentlyChangedSessions[0];
          console.log('Set active session (from recently changed):', activeSession);
          
          // Only auto-remove cancelled sessions (but keep ended sessions visible for review purposes)
          if (activeSession && activeSession.status === 'cancelled') {
            setTimeout(() => {
              if (isMounted.current) {
                setActiveTutoringSessions(prev => {
                  const current = prev[conversationId];
                  if (current && current.id === activeSession?.id && current.status === 'cancelled') {
                    console.log(`Auto-removing cancelled session from active list after timeout`);
                    return {
                      ...prev,
                      [conversationId]: null
                    };
                  }
                  return prev;
                });
              }
            }, 5000);
          }
        }
      }
      
      // Update state
      if (isMounted.current) {
        setTutoringSessions(prev => {
          const updated = {
            ...prev,
            [conversationId]: sessions
          };
          console.log(`Updated tutoringSessions for conversation ${conversationId}:`, updated[conversationId]);
          return updated;
        });
        
        setActiveTutoringSessions(prev => {
          console.log(`Setting active session for ${conversationId}:`, activeSession);
          return {
            ...prev,
            [conversationId]: activeSession
          };
        });
        
        setTutoringSessionsByMessage(prev => {
          // Create a new map with only sessions for the current conversation, 
          // removing any sessions from other conversations that might be mapped to the same message IDs
          const newSessionsMap = { ...prev };
          
          // First, remove any existing mappings for messages in this conversation
          // to avoid keeping stale sessions from the same conversation
          Object.keys(newSessionsMap).forEach(msgId => {
            if (newSessionsMap[msgId]?.conversation_id === conversationId) {
              delete newSessionsMap[msgId];
            }
          });
          
          // Now add the new session mappings
          Object.entries(sessionsMap).forEach(([msgId, session]) => {
            newSessionsMap[msgId] = session;
          });
          
          console.log('Updated tutoringSessionsByMessage for conversation:', conversationId, newSessionsMap);
          return newSessionsMap;
        });
      }
      
      // Broadcast a tutoring session update event
      broadcast('tutoring_session_update');
      
      return sessions;
    } catch (error) {
      console.error('Error loading tutoring sessions:', error);
      return [];
    }
  }, [supabase, broadcast, cleanupStaleSessions]);

  // Subscribe to tutoring session changes for a conversation
  const subscribeTutoringSessionsForConversation = useCallback(async (conversationId: string) => {
    try {
      if (!conversationId || !isMounted.current) return;
      
      // Create a subscription channel for tutoring_session table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log(`Setting up tutoring session subscription for conversation: ${conversationId}`);
      
      // Create a specific channel for the conversation's tutoring updates
      const channelName = `tutoring_session:conversation:${conversationId}`;
      console.log(`Creating channel with name: ${channelName}`);
      
      const sessionChannel = supabase.channel(channelName)
        // Use broadcast for session updates instead of postgres changes
        .on('broadcast', { event: 'session_update' }, async (payload) => {
          console.log('Tutoring session update broadcast received:', payload);
          
          if (payload.payload?.session) {
            const session = payload.payload.session as TutoringSession;
            
            if (!session || !isMounted.current) return;
            
            // First check if this session belongs to this conversation
            if (session.conversation_id !== conversationId) {
              console.log(`Session ${session.id} is for conversation ${session.conversation_id}, not ${conversationId}, ignoring update`);
              return;
            }
            
            // Get conversation participants to ensure the session involves users in this conversation
            const { data: participants, error: participantsError } = await supabase
              .from('conversation_participant')
              .select('user_id')
              .eq('conversation_id', conversationId);
              
            if (participantsError || !participants) {
              console.error('Failed to fetch conversation participants for session update:', participantsError);
              return;
            }
            
            // Create a set of participant IDs for this conversation
            const conversationParticipantIds = new Set(participants.map(p => p.user_id));
            
            // Only process this session if both tutor and student are participants in this conversation
            const isSessionForThisConversation = 
              conversationParticipantIds.has(session.student_id) && 
              conversationParticipantIds.has(session.tutor_id);
              
                          if (!isSessionForThisConversation) {
              console.log(`Session ${session.id} involves users not in conversation ${conversationId}, ignoring update`);
              return;
            }
            
            // Additional check to ensure session is for this conversation
            if (session.conversation_id !== conversationId) {
              console.log(`Session ${session.id} belongs to conversation ${session.conversation_id}, not ${conversationId}, ignoring update`);
              return;
            }
            
            // Update sessions list
            setTutoringSessions(prev => {
              const currentSessions = [...(prev[conversationId] || [])];
              const index = currentSessions.findIndex(s => s.id === session.id);
              
              if (index >= 0) {
                currentSessions[index] = session;
                console.log(`Updated session in list: ${session.id}, status: ${session.status}`);
              } else {
                currentSessions.push(session);
                console.log(`Added new session to list: ${session.id}, status: ${session.status}`);
              }
              
              // Rebuild the message mapping to avoid conflicts
              // Group sessions by message_id
              const sessionsByMessage: Record<string, TutoringSession[]> = {};
              currentSessions.forEach(s => {
                if (!sessionsByMessage[s.message_id]) {
                  sessionsByMessage[s.message_id] = [];
                }
                sessionsByMessage[s.message_id].push(s);
              });
              
              // For each message_id, pick the most appropriate session
              const updatedSessionsMap: Record<string, TutoringSession> = {};
              Object.entries(sessionsByMessage).forEach(([messageId, messageSessions]) => {
                // Sort sessions: active first, then by most recent
                messageSessions.sort((a, b) => {
                  const aActive = ['requested', 'accepted', 'started'].includes(a.status);
                  const bActive = ['requested', 'accepted', 'started'].includes(b.status);
                  
                  if (aActive && !bActive) return -1;
                  if (!aActive && bActive) return 1;
                  
                  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                });
                
                updatedSessionsMap[messageId] = messageSessions[0];
              });
              
              // Update the message mapping
              setTutoringSessionsByMessage(prev => {
                console.log('Updating message mapping after broadcast update:', updatedSessionsMap);
                return updatedSessionsMap;
              });
              
              // After updating the session, determine which session should be active
              let shouldUpdateActiveSession = false;
              let newActiveSession: TutoringSession | null = null;
              
              // Find all active sessions (not ended or cancelled)
              const activeSessions = currentSessions.filter(
                s => s.status === 'requested' || s.status === 'accepted' || s.status === 'started'
              );
              
              // If there are active sessions, pick the most recent one
              if (activeSessions.length > 0) {
                activeSessions.sort((a, b) => 
                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                );
                newActiveSession = activeSessions[0];
                shouldUpdateActiveSession = true;
                console.log(`Setting active session to most recent active: ${newActiveSession.id}`);
              } 
              // If there are no active sessions but this update is for a cancelled/ended session
              else if (session.status === 'cancelled' || session.status === 'ended') {
                // Show it temporarily
                newActiveSession = session;
                shouldUpdateActiveSession = true;
                console.log(`Setting temporarily active cancelled/ended session: ${session.id}`);
                
                // Auto-remove after 5 seconds
                setTimeout(() => {
                  if (isMounted.current) {
                    setActiveTutoringSessions(current => {
                      const activeNow = current[conversationId];
                      if (activeNow && activeNow.id === session.id) {
                        console.log(`Auto-removing ${session.status} session from active list after timeout`);
                        return {
                          ...current,
                          [conversationId]: null
                        };
                      }
                      return current;
                    });
                  }
                }, 5000);
              }
              
              // Update the active session if needed
              if (shouldUpdateActiveSession) {
                setActiveTutoringSessions(currentActive => ({
                  ...currentActive,
                  [conversationId]: newActiveSession
                }));
              }
              
              return {
                ...prev,
                [conversationId]: currentSessions
              };
            });
            
            // Broadcast an internal update event
            broadcast('tutoring_session_update');
          }
        })
        // Also subscribe to session_list_update event to refresh the full list
        .on('broadcast', { event: 'session_list_update' }, (payload) => {
          if (!isMounted.current) return;
          
          console.log('Session list update broadcast received, refreshing sessions');
          
          // Check if the update is for this conversation
          if (payload.payload?.conversation_id && payload.payload.conversation_id !== conversationId) {
            console.log(`Session list update is for conversation ${payload.payload.conversation_id}, not ${conversationId}, ignoring`);
            return;
          }
          
          // Add stronger debouncing to avoid multiple refreshes in rapid succession
          const now = Date.now();
          const lastUpdateTime = lastBroadcastTime.current[`session_list_${conversationId}`] || 0;
          const timeSinceLastUpdate = now - lastUpdateTime;
          
          // Only refresh if it's been at least 5 seconds since the last refresh
          if (timeSinceLastUpdate > 5000) {
            lastBroadcastTime.current[`session_list_${conversationId}`] = now;
            
            // Add a small delay to allow multiple broadcasts to consolidate
            const refreshDelay = sessionUpdateQueue.current[conversationId] ? 1000 : 300;
            
            // Clear any existing timeout for this conversation
            if (sessionUpdateQueue.current[conversationId]) {
              clearTimeout(sessionUpdateQueue.current[conversationId]);
            }
            
            // Set a new timeout to refresh sessions
            sessionUpdateQueue.current[conversationId] = setTimeout(() => {
              if (isMounted.current) {
                // Clear the queue entry
                delete sessionUpdateQueue.current[conversationId];
                // Load sessions
                loadTutoringSessions(conversationId);
              }
            }, refreshDelay);
          } else {
            console.log(`Skipping session list refresh - last refresh was ${timeSinceLastUpdate}ms ago`);
          }
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to tutoring session broadcasts for conversation ${conversationId}`);
          } else if (err) {
            console.error(`Error subscribing to tutoring session broadcasts for ${conversationId}:`, err);
          }
        });
      
      // Broadcast to all clients to ensure consistent state
      sessionChannel.send({
        type: 'broadcast',
        event: 'session_list_update',
        payload: { conversation_id: conversationId }
      });
      
      // Initial load of tutoring sessions - wait for this to complete
      try {
        console.log(`Initial load of tutoring sessions for conversation ${conversationId}`);
        await loadTutoringSessions(conversationId);
        console.log(`Completed initial load of tutoring sessions for conversation ${conversationId}`);
      } catch (err) {
        console.error(`Error in initial load of tutoring sessions for conversation ${conversationId}:`, err);
      }
      
    } catch (error) {
      console.error('Error subscribing to tutoring sessions:', error);
    }
  }, [supabase, loadTutoringSessions, broadcast]);

  // Helper to broadcast tutoring session updates
  const broadcastSessionUpdate = useCallback(async (session: TutoringSession) => {
    try {
      if (!session || !isMounted.current) return;
      
      const channelName = `tutoring_session:conversation:${session.conversation_id}`;
      const channel = supabase.channel(channelName);
      
      // Send the individual session update
      await channel.send({
        type: 'broadcast',
        event: 'session_update',
        payload: { 
          session,
          conversation_id: session.conversation_id // Explicitly include conversation_id for better filtering
        }
      });
      
      // Also send a list update broadcast to ensure all clients refresh their full session lists
      // This is especially important for newly created sessions
      await channel.send({
        type: 'broadcast',
        event: 'session_list_update',
        payload: { conversation_id: session.conversation_id }
      });
      
      console.log(`Broadcast session update for session ${session.id} in conversation ${session.conversation_id}`);
      
      // Force immediate loading of updated session data
      await loadTutoringSessions(session.conversation_id);
    } catch (error) {
      console.error('Error broadcasting session update:', error);
    }
  }, [supabase, loadTutoringSessions]);

  // Channel subscription handler for message events
  const handleMessageBroadcast = useCallback((payload: any, conversationId: string) => {
    console.log('Received message broadcast:', payload);
    if (!isMounted.current) return;
    
    // Check if the message is a test message (from old versions)
    if (payload.message.id.startsWith('test-')) {
      console.log('Ignoring test message:', payload.message.id);
      return;
    }
    
    // Update messages state
    setMessages(prev => {
      const currentMessages = prev[conversationId] || [];
      const messageExists = currentMessages.some(msg => msg.id === payload.message.id);
      
      if (messageExists) {
        console.log('Message already exists in state, skipping update');
        return prev;
      }
      
      console.log('Adding new message to state:', payload.message);
      const updatedMessages = [...currentMessages, payload.message];
      
      // Update cache
      const cacheKey = `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${conversationId}`;
      saveToCache(cacheKey, updatedMessages);
      
      return {
        ...prev,
        [conversationId]: updatedMessages
      };
    });
  }, []);

  // Function to subscribe to a conversation channel with retry
  const subscribeToConversation = useCallback(async (conversationId: string, retryCount = 0) => {
    console.log('subscribeToConversation called with:', conversationId, 'retryCount:', retryCount);
    
    // Skip if already subscribed or not mounted
    if (!isMounted.current || channels[conversationId]) {
      console.log('Already subscribed or not mounted, skipping subscription');
      return;
    }

    try {
      // Ensure we have a valid session before subscribing
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No valid session found');
        return;
      }

      console.log('Got valid session, proceeding with subscription');

      // Keep track of subscription attempts
      const newChannels = { ...channels };
      newChannels[conversationId] = 'pending' as any;
      setChannels(newChannels);
      
      // Verify user has access to the conversation
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participant')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (participantError) {
        console.error('Error checking participant access:', participantError);
        
        // Remove pending status
        const updatedChannels = { ...channels };
        delete updatedChannels[conversationId];
        setChannels(updatedChannels);
        
        // Retry subscription if we haven't exceeded max retries
        if (retryCount < 3) {
          console.log('Retrying subscription in 2 seconds...');
          setTimeout(() => {
            subscribeToConversation(conversationId, retryCount + 1);
          }, 2000);
        }
        return;
      }

      if (!participant) {
        console.error('User does not have access to this conversation');
        // Remove pending status
        const updatedChannels = { ...channels };
        delete updatedChannels[conversationId];
        setChannels(updatedChannels);
        return;
      }

      console.log('User has access to conversation, creating channel');
      const channel = supabase.channel(conversationId, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id },
          // Enable Realtime Authorization to enforce RLS policies
          private: true
        }
      })
        .on('broadcast', { event: 'message' }, ({ payload }) => {
          handleMessageBroadcast(payload, conversationId);

          // Send delivery confirmation
          channel.send({
            type: 'broadcast',
            event: 'delivery',
            payload: { messageId: payload.message.id }
          });

          // Broadcast conversation update for UI refresh with debounce
          const now = Date.now();
          if (!lastBroadcastTime.current[conversationId] || now - lastBroadcastTime.current[conversationId] > 1000) {
            lastBroadcastTime.current[conversationId] = now;
            broadcast('conversation_update');
          }
        })
        .on('broadcast', { event: 'delivery' }, ({ payload }) => {
          console.log('Received delivery confirmation:', payload);
          if (!isMounted.current) return;
          setMessages(prev => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map(msg => 
              msg.id === payload.messageId ? { ...msg, delivered: true } : msg
            )
          }));
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          // Call the extracted typing handler
          handleTypingEvent(payload, conversationId);
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          // Handle new messages from database
          console.log('Received postgres change for message:', payload);
          
          // Only process if this is a new message and we're mounted
          if (!isMounted.current) return;
          
          const newMessage = payload.new as Message;
          
          // Update messages state if not already exists
          setMessages(prev => {
            const currentMessages = prev[conversationId] || [];
            const messageExists = currentMessages.some(msg => msg.id === newMessage.id);
            
            if (messageExists) {
              return prev;
            }
            
            return {
              ...prev,
              [conversationId]: [...currentMessages, newMessage]
            };
          });
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to channel ${conversationId}`);
            
            // Also subscribe to tutoring sessions for this conversation
            subscribeTutoringSessionsForConversation(conversationId);
            
            // Get all participants in the conversation
            supabase
              .from('conversation_participant')
              .select('user_id')
              .eq('conversation_id', conversationId)
              .then(({ data: participants, error: participantsError }) => {
                if (participantsError) {
                  console.error('Error fetching participants:', participantsError);
                  return;
                }

                console.log('Conversation participants:', participants);
                
                // No need to send test messages, it causes duplicates
                // Just log a success message
                console.log(`Successfully subscribed to conversation ${conversationId} with ${participants.length} participants`);
              });
          } else if (err) {
            console.error(`Error subscribing to channel ${conversationId}:`, err.message);
            // Retry subscription if we haven't exceeded max retries
            if (retryCount < 3) {
              console.log('Retrying subscription in 2 seconds...');
              setTimeout(() => {
                subscribeToConversation(conversationId, retryCount + 1);
              }, 2000);
            }
          }
        });

      if (isMounted.current) {
        console.log('Setting channel in state');
        setChannels(prev => ({
          ...prev,
          [conversationId]: channel
        }));
      }

      // When subscribing to a new conversation, attempt to load cached messages first
      const loadCachedMessagesForConversation = () => {
        try {
          const cacheKey = `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${conversationId}`;
          const cachedMessages = getFromCache<Message[]>(cacheKey);
          
          if (cachedMessages && cachedMessages.length > 0) {
            console.log(`Loaded ${cachedMessages.length} cached messages for conversation ${conversationId}`);
            setMessages(prev => ({
              ...prev,
              [conversationId]: cachedMessages
            }));
          }
        } catch (error) {
          console.error('Error loading cached messages:', error);
        }
      };
      
      // Try to load cached messages
      loadCachedMessagesForConversation();
    } catch (error) {
      console.error('Error in subscribeToConversation:', error);
    }
  }, [channels, clearTypingState, handleTypingEvent, subscribeTutoringSessionsForConversation, handleMessageBroadcast]);

  const subscribeToBroadcast = useCallback((event: string, callback: () => void) => {
    if (!isMounted.current) return () => {};
    if (!broadcastSubscriptions.current[event]) {
      broadcastSubscriptions.current[event] = new Set();
    }
    broadcastSubscriptions.current[event].add(callback);

    return () => {
      broadcastSubscriptions.current[event]?.delete(callback);
    };
  }, []);

  const sendMessage = useCallback(async (conversationId: string, message: Message) => {
    if (!isMounted.current) return;
    try {
      console.log('Sending realtime message:', { conversationId, message });
      
      // Update messages
      const currentMessages = messages[conversationId] || [];
      if (isMounted.current) {
        console.log('Updating local messages state');
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...currentMessages, message]
        }));
      }

      // Broadcast message through channel
      const channel = channels[conversationId];
      if (channel) {
        console.log('Broadcasting message through channel');
        try {
          const broadcastResult = await channel.send({
            type: 'broadcast',
            event: 'message',
            payload: { message }
          });
          console.log('Broadcast result:', broadcastResult);
          
          // Verify the broadcast was successful
          if (broadcastResult === 'ok') {
            console.log('Broadcast successful');
          } else {
            console.error('Broadcast failed:', broadcastResult);
            // Try to resubscribe to the channel
            console.log('Attempting to resubscribe to channel');
            await subscribeToConversation(conversationId);
          }
        } catch (error) {
          console.error('Error during broadcast:', error);
          throw error;
        }
      } else {
        console.error('No channel found for conversation:', conversationId);
        // Try to resubscribe to the channel
        console.log('Attempting to resubscribe to channel');
        await subscribeToConversation(conversationId);
      }

      // Only broadcast conversation update if it's been more than 1 second since the last update
      const now = Date.now();
      if (!lastBroadcastTime.current[conversationId] || now - lastBroadcastTime.current[conversationId] > 1000) {
        lastBroadcastTime.current[conversationId] = now;
        broadcast('conversation_update');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [channels, messages, broadcast, subscribeToConversation]);

  // Function to subscribe to a new conversation
  const subscribeToNewConversation = useCallback(async (conversationId: string) => {
    // Don't resubscribe if already subscribed
    if (channels[conversationId]) {
      console.log(`Already subscribed to conversation ${conversationId}, skipping subscription`);
      return;
    }
    
    // Add a check for potential pending subscriptions
    if (pendingSubscriptions.current[conversationId]) {
      console.log(`Subscription already pending for conversation ${conversationId}, skipping duplicate subscription`);
      return;
    }
    
    try {
      // Mark this subscription as pending to prevent duplicate subscriptions
      pendingSubscriptions.current[conversationId] = true;
      console.log(`Subscribing to new conversation ${conversationId}`);
      await subscribeToConversation(conversationId);
    } catch (error) {
      console.error(`Error subscribing to conversation ${conversationId}:`, error);
    } finally {
      // Clear the pending flag when done, whether successful or not
      pendingSubscriptions.current[conversationId] = false;
    }
  }, [channels, subscribeToConversation]);

  // Initialize subscriptions for all conversations the user is part of
  useEffect(() => {
    let isInitialized = false;
    const initializeSubscriptions = async () => {
      if (!isMounted.current || isInitialized) return;
      try {
        console.log('Initializing subscriptions for all conversations');
        isInitialized = true;

        // First, ensure we have the user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Error getting user:', userError);
          return;
        }

        console.log(`RealtimeContext: User authenticated: ${user.id}`);

        // Get the session to ensure we have a valid token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('Error getting session:', sessionError);
          return;
        }

        // Explicitly set the auth token
        supabase.realtime.setAuth(session.access_token);

        // Get all conversations the user is part of - use the right user ID field
        console.log(`RealtimeContext: Querying conversations for user_id = ${user.id}`);
        const { data: conversations, error } = await supabase
          .from('conversation_participant')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching conversations:', error);
          return;
        }

        if (!conversations || conversations.length === 0) {
          console.log('RealtimeContext: No conversations found for user');
          return;
        }

        console.log(`RealtimeContext: Found ${conversations.length} conversations to subscribe to:`, conversations);

        // Subscribe to each conversation using subscribeToNewConversation to avoid duplicates
        for (const conv of conversations) {
          await subscribeToNewConversation(conv.conversation_id);
        }
      } catch (error) {
        console.error('Error in initializeSubscriptions:', error);
      }
    };

    initializeSubscriptions();

    // Cleanup subscriptions and timeouts on unmount
    return () => {
      console.log('Cleaning up all subscriptions');
      isMounted.current = false;
      Object.values(channels).forEach(channel => {
        channel.unsubscribe();
      });
      // Clear all typing timeouts
      Object.entries(typingTimeouts.current).forEach(([conversationId, timeouts]) => {
        Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
      });
      // Clear all typing states
      setIsTyping({});
    };
  }, []); // Empty dependency array to run only once on mount

  // Update context value to include tutoring session data
  const contextValue = useMemo(() => ({
    sendMessage,
    messages,
    updateMessages,
    isTyping,
    setTyping,
    subscribeToNewConversation,
    subscribeToBroadcast,
    // Add tutoring session data
    tutoringSessions,
    activeTutoringSessions,
    tutoringSessionsByMessage,
    broadcastSessionUpdate,
  }), [
    sendMessage,
    messages,
    updateMessages,
    isTyping,
    setTyping,
    subscribeToNewConversation,
    subscribeToBroadcast,
    // Add tutoring session dependencies
    tutoringSessions,
    activeTutoringSessions,
    tutoringSessionsByMessage,
    broadcastSessionUpdate,
  ]);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
} 