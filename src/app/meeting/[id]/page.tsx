"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { 
  Loader2, 
  Video as VideoIcon, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  ScreenShare,
  Users,
  MoreVertical,
  MessageSquare,
  X,
  Send
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack
} from "agora-rtc-sdk-ng";

// Define types for our state
interface UserState {
  uid: string | number;
  audio: boolean;
  video: boolean;
}

interface Message {
  id: string;
  content: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
  isSessionRequest?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
}

export default function MeetingPage() {
  const { id: sessionId } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { subscribeToConversation } = useRealtime();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [token, setToken] = useState<string>("");
  const [channelName, setChannelName] = useState<string>("");
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const initRef = useRef<boolean>(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userUidRef = useRef<number | null>(null);
  const fetchedMessagesRef = useRef<boolean>(false);
  const fetchedSessionRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isConfirmExitEnabled, setIsConfirmExitEnabled] = useState<boolean>(false);

  // Add confirmation when user tries to leave the page
  useBeforeUnload(
    isConfirmExitEnabled, 
    "Are you sure you want to leave the meeting? Your connection will be terminated."
  );
  
  // Add navigation listener to handle back button and other navigation
  useEffect(() => {
    // Enable exit confirmation after component mounts and connection is established
    if (isConnected && !isLoading) {
      setIsConfirmExitEnabled(true);
    }
    
    // This effect will run when the component mounts and when pathname changes
    // When pathname changes, it means we're navigating away
    return () => {
      // This cleanup will run when the component unmounts or pathname changes
      setIsConfirmExitEnabled(false); // Disable confirmation once we're already navigating
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [pathname, isConnected, isLoading]);
  
  // Fetch session details to get conversation ID
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId || !user || fetchedSessionRef.current) return;
      
      try {
        setIsLoading(true);
        fetchedSessionRef.current = true;
        
        const response = await fetch(`/api/tutoring-sessions?session_id=${sessionId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch session details: ${response.status} ${errorData.error || ''}`);
        }
        
        const data = await response.json();
        
        if (data.session) {
          setConversationId(data.session.conversation_id);
          
          // Fetch messages once we have the conversation ID
          if (data.session.conversation_id) {
            fetchMessages(data.session.conversation_id);
            
            // Subscribe to real-time updates for this conversation
            subscribeToConversation(data.session.conversation_id);
          }
        } else {
          toast({
            title: "Error",
            description: "Session not found or you don't have permission to access it",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Could not load session details",
          variant: "destructive",
        });
        // Reset the fetch flag on error to allow retrying
        fetchedSessionRef.current = false;
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessionDetails();
  }, [sessionId, user, subscribeToConversation]);
  
  // Fetch messages for the conversation - only called once per conversationId
  const fetchMessages = async (convoId: string) => {
    if (!convoId || fetchedMessagesRef.current) return;
    
    setIsLoadingMessages(true);
    fetchedMessagesRef.current = true;
    
    try {
      const response = await fetch(`/api/messages?conversation_id=${convoId}`, {
        // Add cache control headers to prevent browser caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.messages) {
        
        // Filter out session request messages
        const filteredMessages = data.messages.filter((msg: Message) => {
          // Exclude messages that start with "Session Request:" or have isSessionRequest flag
          return !(
            msg.isSessionRequest || 
            (msg.content && msg.content.trim().startsWith('Session Request:'))
          );
        });
        
        
        // Create a map of message IDs to avoid duplicates
        const messageMap = new Map();
        filteredMessages.forEach((msg: Message) => {
          messageMap.set(msg.id, msg);
        });
        
        // Convert back to array
        setMessages(Array.from(messageMap.values()));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load messages",
        variant: "destructive",
      });
      // Reset the fetch flag on error to allow retrying
      fetchedMessagesRef.current = false;
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Listen for real-time message updates
  useEffect(() => {
    // Create a handler for new messages
    const handleNewMessage = (event: StorageEvent) => {
      if (event.key === 'latest_message' && event.newValue && conversationId) {
        try {
          const messageData = JSON.parse(event.newValue);
          
          // Check if the message belongs to our conversation
          if (messageData.conversation_id === conversationId) {
            // Filter out session request messages
            if (
              messageData.isSessionRequest || 
              (messageData.content && messageData.content.trim().startsWith('Session Request:'))
            ) {
              return; // Skip session request messages
            }
            
            // Add the new message to our list with proper deduplication
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const exists = prev.some(m => m.id === messageData.id);
              if (exists) return prev;
              
              // Also check for pending/sending messages that might match this one
              const pendingIndex = messageData.sender_id === user?.id ? 
                prev.findIndex(msg => 
                  msg.status === 'sending' && 
                  msg.content === messageData.content && 
                  msg.sender_id === messageData.sender_id &&
                  msg.id !== messageData.id
                ) : -1;
                
              if (pendingIndex >= 0) {
                // Replace the pending message with the confirmed one
                const updatedMessages = [...prev];
                updatedMessages[pendingIndex] = {
                  ...updatedMessages[pendingIndex],
                  ...messageData,
                  status: 'sent'
                };
                return updatedMessages;
              }
              
              // It's a new message - add it to the end
              return [...prev, messageData];
            });
            
            // Scroll to bottom for new messages
            scrollToBottom();
          }
        } catch (error) {
        }
      }
    };
    
    // Add event listener for storage events (used by RealtimeContext)
    window.addEventListener('storage', handleNewMessage);
    
    return () => {
      window.removeEventListener('storage', handleNewMessage);
    };
  }, [conversationId, user?.id]);
  
  // Reset fetch flags when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      fetchedMessagesRef.current = false;
      fetchedSessionRef.current = false;
    };
  }, [conversationId]);
  
  // Send a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || !user) return;
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: messageText,
      conversation_id: conversationId,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      status: 'sending' as 'sending' | 'sent' | 'delivered' | 'error',
      sender: {
        id: user.id,
        display_name: user.email?.split('@')[0] || 'You',
        avatar_url: user.avatar_url || null,
        is_tutor: user.role === 'tutor'
      }
    };
    
    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Clear input and scroll to bottom
    setMessageText('');
    scrollToBottom();
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: messageText
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const serverMessage = await response.json();
      
      // Update the optimistic message with the server response
      setMessages(prev => {
        const updatedMessages = [...prev];
        const tempIndex = updatedMessages.findIndex(msg => msg.id === tempId);
        
        if (tempIndex >= 0) {
          // Replace the temporary message with the real one
          updatedMessages[tempIndex] = {
            ...updatedMessages[tempIndex],
            ...serverMessage,
            status: 'sent'
          };
          
          // Check for any duplicates with the same server ID
          const duplicateIndex = updatedMessages.findIndex(
            (msg, idx) => idx !== tempIndex && msg.id === serverMessage.id
          );
          
          if (duplicateIndex >= 0) {
            // Remove the duplicate
            updatedMessages.splice(duplicateIndex, 1);
          }
        }
        
        return updatedMessages;
      });
      
      // Store in localStorage to trigger the RealtimeContext notification system
      // This ensures other tabs/components get the update
      if (typeof window !== 'undefined') {
        const notificationMessage = {
          ...serverMessage,
          _notificationTimestamp: Date.now(),
          sender: {
            id: user.id,
            display_name: user.email?.split('@')[0] || 'You',
            avatar_url: user.avatar_url || null,
            is_tutor: user.role === 'tutor'
          }
        };
        
        localStorage.setItem('latest_message', JSON.stringify(notificationMessage));
      }
    } catch (error) {
      
      // Update the optimistic message to show error
      setMessages(prev => {
        const updatedMessages = [...prev];
        const tempIndex = updatedMessages.findIndex(msg => msg.id === tempId);
        
        if (tempIndex >= 0) {
          updatedMessages[tempIndex] = {
            ...updatedMessages[tempIndex],
            status: 'error'
          };
        }
        
        return updatedMessages;
      });
      
      toast({
        title: "Error",
        description: "Could not send message",
        variant: "destructive",
      });
    }
  };
  
  // Format message time
  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show/hide controls with mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Initial timeout to hide controls
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Initialize Agora client
  useEffect(() => {
    // Prevent multiple initializations
    if (initRef.current || isConnected) return;
    
    const initAgora = async () => {
      if (!user || !sessionId) return;

      try {
        initRef.current = true;
        
        // Disable Agora logging in production to reduce console noise
        if (process.env.NODE_ENV === 'production') {
          // Set log level to ERROR in production (only shows errors)
          AgoraRTC.setLogLevel(1); // 3 = ERROR level
          // Disable log upload to Agora's servers - method doesn't take parameters
          AgoraRTC.disableLogUpload();
        } else {
          // In development, use INFO level for debugging
          AgoraRTC.setLogLevel(1); // 1 = INFO level
          // In development, still disable log upload for privacy
          AgoraRTC.disableLogUpload();
        }
        
        // Create Agora client
        const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        setClient(agoraClient);

        // Generate a consistent UID for this user and session
        // Use a combination of user ID and session ID to create a stable numeric UID
        const uidSource = `${user.id}-${sessionId}`;
        const numericUid = parseInt(uidSource.replace(/\D/g, '').slice(0, 8)) || Math.floor(Math.random() * 100000);
        
        // Store the UID in a ref for reconnection
        userUidRef.current = numericUid;
        
        // Fetch token from server using the session ID as the channel name
        const response = await fetch(`/api/agora/token?channelName=${sessionId}&uid=${numericUid}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to get token");
        }
        
        setToken(data.token);
        setChannelName(sessionId as string);
        
        // Set up event listeners
        agoraClient.on("user-published", async (remoteUser, mediaType) => {
          try {
            
            // Subscribe to the remote user
            await agoraClient.subscribe(remoteUser, mediaType);
            
            if (mediaType === "video") {
              // Add or update the remote user in state
              setRemoteUsers(prev => {
                // Find existing user to preserve their audio state
                const existingUser = prev.find(user => user.uid === remoteUser.uid);
                // Keep hasAudio from existing user record if it exists
                const hasAudio = existingUser ? existingUser.hasAudio : false;
                const updatedUser = { 
                  ...remoteUser,
                  hasVideo: true,
                  // Preserve audio status if the user already exists
                  hasAudio: hasAudio 
                };
                
                const existingUsers = prev.filter(user => user.uid !== remoteUser.uid);
                return [...existingUsers, updatedUser];
              });
              
              // Try to play the video with a slight delay to ensure DOM is ready
              if (remoteUser.videoTrack) {
                // Add a retry mechanism for playing video
                const playVideoWithRetry = (attempts = 0) => {
                  try {
                    const playerElement = document.getElementById(`remote-video-${remoteUser.uid}`);
                    if (playerElement && remoteUser.videoTrack) {
                      // Use a try-catch block specifically for the play operation
                      try {
                        remoteUser.videoTrack.play(`remote-video-${remoteUser.uid}`, { fit: 'cover' });
                      } catch (playError) {
                        // If we get an error but still have attempts left, retry
                        if (attempts < 3) {
                          setTimeout(() => playVideoWithRetry(attempts + 1), 800);
                        }
                      }
                    } else if (attempts < 3) {
                      // If element not found yet but still have attempts left, retry
                      setTimeout(() => playVideoWithRetry(attempts + 1), 800);
                    }
                  } catch (error) {
                    if (attempts < 3) {
                      setTimeout(() => playVideoWithRetry(attempts + 1), 800);
                    }
                  }
                };
                
                // Initial delay to ensure DOM is ready
                setTimeout(() => playVideoWithRetry(), 500);
              }
            }
            
            if (mediaType === "audio") {
              // Update remote user audio status
              setRemoteUsers(prev => {
                // Find existing user to preserve their video state
                const existingUser = prev.find(user => user.uid === remoteUser.uid);
                // Keep hasVideo from existing user record if it exists
                const hasVideo = existingUser ? existingUser.hasVideo : false;
                const updatedUser = { 
                  ...remoteUser,
                  hasAudio: true, 
                  // Preserve video status if the user already exists
                  hasVideo: hasVideo 
                };
                
                const existingUsers = prev.filter(user => user.uid !== remoteUser.uid);
                return [...existingUsers, updatedUser];
              });
              
              // Play audio automatically
              if (remoteUser.audioTrack) {
                remoteUser.audioTrack.play();
              }
            }
          } catch (error) {
          }
        });

        agoraClient.on("user-unpublished", (remoteUser, mediaType) => {
          
          if (mediaType === "video") {
            setRemoteUsers(prev => 
              prev.map(user => 
                user.uid === remoteUser.uid ? { ...user, hasVideo: false } : user
              )
            );
          }
          if (mediaType === "audio") {
            setRemoteUsers(prev => 
              prev.map(user => 
                user.uid === remoteUser.uid ? { ...user, hasAudio: false } : user
              )
            );
          }
        });

        agoraClient.on("user-left", (remoteUser) => {
          // Remove the user from the remote users list
          setRemoteUsers(prev => 
            prev.filter(user => user.uid !== remoteUser.uid)
          );
        });

        agoraClient.on("connection-state-change", (state) => {
          if (state === "CONNECTED") {
            setIsConnected(true);
          } else if (state === "DISCONNECTED") {
            setIsConnected(false);
          }
        });

        // Join channel with numeric UID
        await agoraClient.join(
          process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
          sessionId as string,
          data.token,
          numericUid
        );

        // Create and publish local tracks
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        await agoraClient.publish([audioTrack, videoTrack]);
        
        setIsConnected(true);
        setIsLoading(false);

        // Define cleanup function
        const cleanup = async () => {
          try {
            // Set a flag to prevent re-entry
            if (cleanupRef.current === null) {
              return;
            }
            
            // Stop screen sharing if active
            if (screenTrack) {
              screenTrack.close();
              setScreenTrack(null);
            }
            
            // Close audio and video tracks
            if (audioTrack) {
              try {
                audioTrack.close();
              } catch (audioErr) {
              }
              setLocalAudioTrack(null);
            }
            
            if (videoTrack) {
              try {
                videoTrack.close();
              } catch (videoErr) {
              }
              setLocalVideoTrack(null);
            }
            
            // Leave the channel
            if (agoraClient) {
              try {
                await agoraClient.leave();
              } catch (leaveErr) {
              }
              
              // Nullify the client reference to prevent further usage
              setClient(null);
            }
            
            setIsConnected(false);
            initRef.current = false;
            
            // Clear the cleanup reference to indicate completion
            cleanupRef.current = null;
          } catch (err) {
            // Still mark cleanup as complete even if there was an error
            cleanupRef.current = null;
            setClient(null);
            setLocalAudioTrack(null);
            setLocalVideoTrack(null);
            setScreenTrack(null);
            setIsConnected(false);
            initRef.current = false;
          }
        };
        
        // Store cleanup function in ref for use elsewhere
        cleanupRef.current = cleanup;
        
      } catch (error) {
        toast({
          title: "Error joining meeting",
          description: "There was a problem connecting to the video call.",
          variant: "destructive",
        });
        initRef.current = false;
        setIsLoading(false);
      }
    };

    initAgora();

    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [user, sessionId]);

  // Add beforeunload event listener to clean up when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      setIsConfirmExitEnabled(false); // Disable further confirmations
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Add visibility change listener to handle tab focus/blur
  useEffect(() => {
    // Track if we need to reconnect
    let needsReconnect = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    let hiddenTimeoutId: NodeJS.Timeout | null = null;
    const MAX_RECONNECT_ATTEMPTS = 3;
    const RECONNECT_DELAY = 2000;
    const AUTO_DISCONNECT_TIMEOUT = 30000; // 30 seconds
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is hidden, mark that we might need to reconnect later
        needsReconnect = true;
        
        // If we have a pending reconnect timeout, clear it
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        
        // Set a timeout to clean up resources if page remains hidden for too long
        hiddenTimeoutId = setTimeout(() => {
          if (cleanupRef.current) {
            cleanupRef.current();
          }
        }, AUTO_DISCONNECT_TIMEOUT);
        
      } else if (document.visibilityState === 'visible') {
        // Clear the auto-disconnect timeout when page becomes visible again
        if (hiddenTimeoutId) {
          clearTimeout(hiddenTimeoutId);
          hiddenTimeoutId = null;
        }
        
        
        // Only attempt reconnection if we're not already connected and we've previously lost visibility
        if (needsReconnect && client && !isLoading && !isConnected && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          
          // Set a short delay before reconnecting to avoid rapid reconnection attempts
          reconnectTimeout = setTimeout(async () => {
            try {
              reconnectAttempts++;
              
              // First, ensure we've fully cleaned up any existing connection
              
              // Clean up existing tracks
              if (isScreenSharing && screenTrack) {
                screenTrack.close();
                setScreenTrack(null);
              }
              
              if (localAudioTrack) {
                localAudioTrack.close();
                setLocalAudioTrack(null);
              }
              
              if (localVideoTrack) {
                localVideoTrack.close();
                setLocalVideoTrack(null);
              }
              
              // Leave the channel
              try {
                await client.leave();
              } catch (leaveError) {
                // Continue with reconnection attempt even if leave fails
              }
              
              // Reset connection state
              setIsConnected(false);
              setRemoteUsers([]);
              
              // Wait a moment before reconnecting
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              if (!user || !sessionId || !userUidRef.current) {
                return;
              }
              
              try {
                
                // Use the SAME UID as before to avoid conflicts
                const numericUid = userUidRef.current;
                
                // Fetch a fresh token
                const response = await fetch(`/api/agora/token?channelName=${sessionId}&uid=${numericUid}`);
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.error || "Failed to get token for reconnection");
                }
                
                // Join with the same UID
                await client.join(
                  process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
                  sessionId as string,
                  data.token,
                  numericUid
                );
                
                // Create and publish new local tracks
                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                
                // Apply previous mute states
                if (isAudioMuted) {
                  await audioTrack.setEnabled(false);
                }
                
                if (isVideoMuted) {
                  await videoTrack.setEnabled(false);
                }
                
                setLocalAudioTrack(audioTrack);
                setLocalVideoTrack(videoTrack);
                
                await client.publish([audioTrack, videoTrack]);
                
                setIsConnected(true);
                needsReconnect = false;
                reconnectAttempts = 0;
              } catch (error) {
                
                // If we still have attempts left, try again after a delay
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                  reconnectTimeout = setTimeout(() => {
                    handleVisibilityChange();
                  }, RECONNECT_DELAY);
                } else {
                  toast({
                    title: "Reconnection failed",
                    description: "Failed to reconnect to the video call. Please refresh the page.",
                    variant: "destructive",
                  });
                }
              }
            } catch (error) {
            }
          }, RECONNECT_DELAY);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (hiddenTimeoutId) {
        clearTimeout(hiddenTimeoutId);
      }
    };
  }, [isConnected, client, user, sessionId, isScreenSharing, screenTrack, localAudioTrack, localVideoTrack, isAudioMuted, isVideoMuted, isLoading]);

  // Effect to handle playing remote video tracks when the component updates
  useEffect(() => {
    // Make sure remoteUsers is defined and is an array
    if (!remoteUsers || !Array.isArray(remoteUsers)) return;
    
    // Create a function to play video that handles AbortError
    const playVideoWithRetry = (user: any, attempts = 0) => {
      const MAX_ATTEMPTS = 5;
      if (!user || !user.videoTrack || attempts >= MAX_ATTEMPTS) return;

      try {
        const playerElement = document.getElementById(`remote-video-${user.uid}`);
        if (playerElement && user.hasVideo) {
          try {
            // First stop any existing playback to avoid conflicts
            if (user.videoTrack._isPlaying) {
              try {
                user.videoTrack.stop();
              } catch (stopError) {
                // Ignore stop errors, just continue to play
              }
            }
            
            // Try playing the track
            user.videoTrack.play(`remote-video-${user.uid}`, { fit: 'cover' });
          } catch (playError) {
            // If we get an AbortError or other error, retry after a delay
            if (attempts < MAX_ATTEMPTS) {
              setTimeout(() => playVideoWithRetry(user, attempts + 1), 800);
            }
          }
        } else if (attempts < MAX_ATTEMPTS) {
          // Element might not be in DOM yet, retry
          setTimeout(() => playVideoWithRetry(user, attempts + 1), 800);
        }
      } catch (error) {
        // Any other error, retry if we have attempts left
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(() => playVideoWithRetry(user, attempts + 1), 800);
        }
      }
    };

    // Try to play each remote user's video with a slight delay
    remoteUsers.forEach(user => {
      if (user && user.videoTrack && user.hasVideo) {
        // Use staggered timeouts to avoid overwhelming the browser
        setTimeout(() => playVideoWithRetry(user), 300);
      }
    });
  }, [remoteUsers]);

  const toggleAudio = async () => {
    if (!localAudioTrack) return;
    
    try {
      const newMuteState = !isAudioMuted;
      
      await localAudioTrack.setEnabled(!newMuteState);
      setIsAudioMuted(newMuteState);
      
      toast({
        title: newMuteState ? "Microphone Muted" : "Microphone Unmuted",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Failed to toggle microphone",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = async () => {
    if (!localVideoTrack) return;
    
    try {
      const newMuteState = !isVideoMuted;
      
      await localVideoTrack.setEnabled(!newMuteState);
      setIsVideoMuted(newMuteState);
      
      toast({
        title: newMuteState ? "Camera Turned Off" : "Camera Turned On",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Failed to toggle camera",
        variant: "destructive",
      });
    }
  };

  const toggleScreenSharing = async () => {
    if (!client) return;

    try {
      if (!isScreenSharing) {
        // Start screen sharing
        
        // createScreenVideoTrack can return either a single track or an array of tracks
        const screenTracks = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: "1080p_1"
        });
        
        // Handle the return value which can be a single track or an array
        const videoTrack = Array.isArray(screenTracks) ? screenTracks[0] : screenTracks;
        setScreenTrack(videoTrack);
        
        // Unpublish camera track and publish screen track
        if (localVideoTrack) {
          await client.unpublish(localVideoTrack);
        }
        
        await client.publish(videoTrack);
        
        // Add screen sharing ended event listener
        videoTrack.on("track-ended", async () => {
          await stopScreenSharing();
        });
        
        setIsScreenSharing(true);
        
        toast({
          title: "Screen Sharing Started",
          duration: 1500,
        });
      } else {
        await stopScreenSharing();
      }
    } catch (error) {
      toast({
        title: "Screen sharing failed",
        description: "There was a problem with screen sharing.",
        variant: "destructive",
      });
    }
  };
  
  // Extract stop screen sharing logic to a separate function
  const stopScreenSharing = async () => {
    if (!client) return;
    
    try {
      // Stop screen sharing
      
      // Unpublish screen track
      if (screenTrack) {
        await client.unpublish(screenTrack);
        screenTrack.close();
        setScreenTrack(null);
      }
      
      // Republish camera track if it exists and is not already published
      if (localVideoTrack) {
        // Check if track is already published
        const localTracks = client.localTracks;
        const isVideoPublished = localTracks.some(track => track.trackMediaType === "video" && track !== screenTrack);
        
        if (!isVideoPublished) {
          await client.publish(localVideoTrack);
          
          // If video was not muted before screen sharing, ensure it's enabled
          if (!isVideoMuted) {
            await localVideoTrack.setEnabled(true);
          }
        }
      }
      
      setIsScreenSharing(false);
      
      toast({
        title: "Screen Sharing Stopped",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Error stopping screen sharing",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = async () => {
    try {
      setIsConfirmExitEnabled(false); // Disable exit confirmation since user explicitly chose to leave
      setIsLoading(true); // Show loading state while cleaning up
      if (cleanupRef.current) {
        // Use the same cleanup function for consistency
        await cleanupRef.current();
      }
      
      // Add a small delay to ensure cleanup completes before navigation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirect to messages page instead of session page
      router.push('/dashboard/messages');
    } catch (error) {
      // Still redirect even if there's an error with cleanup
      router.push('/dashboard/messages');
    }
  };

  // Add a handler for Enter key in the message input
  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter key (without shift for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default to avoid new line
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg">Connecting to meeting...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Main content area - Remote user's video or placeholder */}
      <div className={`absolute inset-0 transition-all duration-300 ${isChatOpen ? 'right-[400px]' : ''}`}>
        {remoteUsers.length > 0 ? (
          remoteUsers.map((user) => (
            <div 
              key={user.uid} 
              className="w-full h-full"
            >
              {user.hasVideo ? (
                <div 
                  id={`remote-video-${user.uid}`}
                  className="w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="rounded-full bg-gray-700 w-32 h-32 flex items-center justify-center">
                    <span className="text-white text-4xl">
                      {user.uid.toString().charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              {/* Status indicator for remote user */}
              {!user.hasAudio && (
                <div className="absolute top-4 right-4">
                  <div className="bg-black/60 text-white rounded-full p-2">
                    <MicOff className="h-5 w-5" />
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <Users className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <p className="text-xl">Waiting for others to join</p>
              <p className="mt-2 text-gray-400">Share the meeting link to invite someone</p>
            </div>
          </div>
        )}
      </div>

      {/* Local video pip - adjust position when chat is open */}
      <div className={`absolute top-4 transition-all duration-300 ${isChatOpen ? 'right-[420px]' : 'right-4'} w-48 h-28 md:w-64 md:h-36 lg:w-80 lg:h-45 rounded-xl overflow-hidden shadow-lg border border-gray-700 z-10`}>
        {!isVideoMuted ? (
          <div 
            className="w-full h-full"
            ref={el => {
              if (el) {
                try {
                  // Display screen track if screen sharing is active, otherwise show camera
                  if (isScreenSharing && screenTrack) {
                    screenTrack.play(el);
                  } else if (localVideoTrack && !isVideoMuted) {
                    localVideoTrack.play(el);
                  }
                } catch (err) {
                }
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-800">
            <div className="rounded-full bg-gray-700 w-16 h-16 flex items-center justify-center">
              <span className="text-white text-2xl">
                {user?.email?.charAt(0).toUpperCase() || "Y"}
              </span>
            </div>
          </div>
        )}
        
        {/* Muted indicator for local user */}
        {isAudioMuted && (
          <div className="absolute bottom-2 right-2">
            <div className="bg-black/60 text-white rounded-full p-1">
              <MicOff className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Control bar - adjust position when chat is open */}
      <div 
        className={`absolute bottom-8 transition-all duration-300 ${isChatOpen ? 'left-[calc(50%-200px)]' : 'left-1/2'} transform -translate-x-1/2 bg-black/70 rounded-full px-4 py-3 flex items-center space-x-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <Button 
          variant={isAudioMuted ? "destructive" : "secondary"} 
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleAudio}
        >
          {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        
        <Button 
          variant={isVideoMuted ? "destructive" : "secondary"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleVideo}
        >
          {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
        </Button>
        
        <Button 
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleScreenSharing}
        >
          <ScreenShare className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
        
        <Button 
          variant={isChatOpen ? "default" : "secondary"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Session information */}
      <div className="absolute top-4 left-4 bg-black/40 text-white py-2 px-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>{remoteUsers.length + 1} participants</span>
        </div>
      </div>
      
      {/* Chat drawer */}
      <div className={`chat-drawer ${isChatOpen ? 'open' : ''}`}>
        <div className="chat-drawer-toggle" onClick={() => setIsChatOpen(!isChatOpen)}>
          {isChatOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </div>
        
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Chat</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => setIsChatOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          {isLoadingMessages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender_id === user?.id 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {message.sender_id === user?.id ? 'You' : message.sender?.display_name || 'Other'}
                    </p>
                    <p>{message.content}</p>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t">
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleSendMessage(); 
            }} 
            className="flex gap-2"
          >
            <Textarea 
              placeholder="Type a message..." 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleMessageKeyDown}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none py-2"
              style={{ height: '40px', overflowY: 'auto' }}
            />
            <Button 
              type="submit" 
              disabled={!messageText.trim()}
              className="self-end h-[40px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 