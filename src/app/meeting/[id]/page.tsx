"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
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
}

export default function MeetingPage() {
  const { id: sessionId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
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

  // Fetch session details to get conversation ID
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId || !user) return;
      
      try {
        const response = await fetch(`/api/tutoring-sessions?session_id=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch session details');
        }
        
        const data = await response.json();
        
        if (data.sessions && data.sessions.length > 0) {
          const session = data.sessions[0];
          console.log("Session details fetched:", session);
          setConversationId(session.conversation_id);
          
          // Fetch messages once we have the conversation ID
          if (session.conversation_id) {
            fetchMessages(session.conversation_id);
          }
        } else {
          console.error("No sessions found for ID:", sessionId);
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
        toast({
          title: "Error",
          description: "Could not load session details",
          variant: "destructive",
        });
      }
    };
    
    fetchSessionDetails();
  }, [sessionId, user]);
  
  // Fetch messages for the conversation
  const fetchMessages = async (convoId: string) => {
    if (!convoId) return;
    
    setIsLoadingMessages(true);
    
    try {
      console.log("Fetching messages for conversation:", convoId);
      const response = await fetch(`/api/messages?conversation_id=${convoId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.messages) {
        console.log(`Messages loaded: ${data.messages.length} messages`);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Could not load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Poll for new messages periodically
  useEffect(() => {
    if (!conversationId) return;
    
    // Initial fetch
    fetchMessages(conversationId);
    
    // Set up polling interval
    const interval = setInterval(() => {
      if (conversationId) {
        fetchMessages(conversationId);
      }
    }, 10000); // Poll every 10 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [conversationId]);
  
  // Send a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || !user) return;
    
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
      
      const newMessage = await response.json();
      
      // Add the new message to the list
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      
      // Scroll to bottom
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
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
        
        // Create Agora client
        const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        setClient(agoraClient);

        // Convert user ID to a numeric UID for Agora
        // Extract numeric values from the user ID
        const numericUid = parseInt(user.id.replace(/\D/g, '').slice(0, 8)) || Math.floor(Math.random() * 100000);
        
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
            console.log(`Remote user ${remoteUser.uid} published ${mediaType}`);
            
            // Subscribe to the remote user
            await agoraClient.subscribe(remoteUser, mediaType);
            console.log(`Subscribed to ${remoteUser.uid}'s ${mediaType}`);
            
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
                console.log(`Remote user ${remoteUser.uid} has video track, attempting to play`);
                setTimeout(() => {
                  try {
                    const playerElement = document.getElementById(`remote-video-${remoteUser.uid}`);
                    if (playerElement && remoteUser.videoTrack) {
                      remoteUser.videoTrack.play(`remote-video-${remoteUser.uid}`);
                      console.log(`Successfully played video for ${remoteUser.uid}`);
                    } else {
                      console.warn(`Player element for ${remoteUser.uid} not found or track missing`);
                    }
                  } catch (error) {
                    console.error(`Error playing video for ${remoteUser.uid}:`, error);
                  }
                }, 500);
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
                console.log(`Playing audio for ${remoteUser.uid}`);
              }
            }
          } catch (error) {
            console.error("Error subscribing to remote user:", error);
          }
        });

        agoraClient.on("user-unpublished", (remoteUser, mediaType) => {
          console.log(`Remote user ${remoteUser.uid} unpublished ${mediaType}`);
          
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
          console.log(`Remote user ${remoteUser.uid} left the channel`);
          // Remove the user from the remote users list
          setRemoteUsers(prev => 
            prev.filter(user => user.uid !== remoteUser.uid)
          );
        });

        agoraClient.on("connection-state-change", (state) => {
          console.log("Connection state changed to:", state);
          if (state === "CONNECTED") {
            setIsConnected(true);
          } else if (state === "DISCONNECTED") {
            setIsConnected(false);
          }
        });

        // Join channel with numeric UID
        console.log(`Joining channel ${sessionId} with UID ${numericUid}`);
        await agoraClient.join(
          process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
          sessionId as string,
          data.token,
          numericUid
        );
        console.log("Successfully joined channel");

        // Create and publish local tracks
        console.log("Creating local audio and video tracks");
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        console.log("Publishing local tracks to channel");
        await agoraClient.publish([audioTrack, videoTrack]);
        console.log("Successfully published local tracks");
        
        setIsConnected(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error setting up Agora:", error);
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
      if (client) {
        // Stop screen sharing if active
        if (isScreenSharing && screenTrack) {
          screenTrack.close();
        }
        
        // Close all tracks
        localAudioTrack?.close();
        localVideoTrack?.close();
        
        client.leave().then(() => {
          console.log("Left channel successfully");
          setIsConnected(false);
          initRef.current = false;
        }).catch(err => {
          console.error("Error leaving channel:", err);
        });
      }
    };
  }, [user, sessionId]);

  // Add visibility change listener to handle tab focus/blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Simply log tab visibility changes without attempting reconnection
      if (document.visibilityState === 'visible') {
        console.log("Tab regained visibility - connection state:", isConnected ? "connected" : "disconnected");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected]);

  // Effect to handle playing remote video tracks when the component updates
  useEffect(() => {
    // Make sure remoteUsers is defined and is an array
    if (!remoteUsers || !Array.isArray(remoteUsers)) return;
    
    console.log(`Attempting to play videos for ${remoteUsers.length} remote users`);
    
    // Play all remote video tracks
    remoteUsers.forEach(user => {
      if (user && user.videoTrack && user.hasVideo) {
        try {
          console.log(`Attempting to play video for user ${user.uid} in useEffect`);
          // Try with a small delay to ensure DOM is ready
          setTimeout(() => {
            const playerElement = document.getElementById(`remote-video-${user.uid}`);
            if (playerElement && user.videoTrack) {
              try {
                user.videoTrack.play(`remote-video-${user.uid}`);
                console.log(`Successfully played video for user ${user.uid} in useEffect`);
              } catch (error) {
                console.error(`Error playing video for user ${user.uid}:`, error);
              }
            }
          }, 200);
        } catch (error) {
          console.error(`Error setting up video playback for user ${user.uid}:`, error);
        }
      }
    });
  }, [remoteUsers]);

  const toggleAudio = async () => {
    if (!localAudioTrack) return;
    
    try {
      const newMuteState = !isAudioMuted;
      console.log(`Setting audio enabled: ${!newMuteState}`);
      
      await localAudioTrack.setEnabled(!newMuteState);
      setIsAudioMuted(newMuteState);
      
      toast({
        title: newMuteState ? "Microphone Muted" : "Microphone Unmuted",
        duration: 1500,
      });
    } catch (error) {
      console.error("Error toggling audio:", error);
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
      console.log(`Setting video enabled: ${!newMuteState}`);
      
      await localVideoTrack.setEnabled(!newMuteState);
      setIsVideoMuted(newMuteState);
      
      toast({
        title: newMuteState ? "Camera Turned Off" : "Camera Turned On",
        duration: 1500,
      });
    } catch (error) {
      console.error("Error toggling video:", error);
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
        console.log("Starting screen sharing");
        
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
          console.log("Unpublished camera track");
        }
        
        await client.publish(videoTrack);
        console.log("Published screen sharing track");
        
        // Add screen sharing ended event listener
        videoTrack.on("track-ended", async () => {
          console.log("Screen sharing ended by system event");
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
      console.error("Error toggling screen sharing:", error);
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
      console.log("Stopping screen sharing");
      
      // Unpublish screen track
      if (screenTrack) {
        await client.unpublish(screenTrack);
        screenTrack.close();
        setScreenTrack(null);
        console.log("Unpublished screen track");
      }
      
      // Republish camera track if it exists and is not already published
      if (localVideoTrack) {
        // Check if track is already published
        const localTracks = client.localTracks;
        const isVideoPublished = localTracks.some(track => track.trackMediaType === "video" && track !== screenTrack);
        
        if (!isVideoPublished) {
          await client.publish(localVideoTrack);
          console.log("Republished camera track");
          
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
      console.error("Error stopping screen sharing:", error);
      toast({
        title: "Error stopping screen sharing",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = async () => {
    try {
      // Close all tracks
      localAudioTrack?.close();
      localVideoTrack?.close();
      screenTrack?.close();
      
      // Leave the channel
      if (client) {
        await client.leave();
      }
      
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Error leaving channel:", error);
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
                  console.error("Error playing local video:", err);
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
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            />
            <Button 
              type="submit" 
              disabled={!messageText.trim()}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 