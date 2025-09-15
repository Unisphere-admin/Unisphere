"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { toast } from "@/components/ui/use-toast";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { Loader2 } from "lucide-react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack
} from "agora-rtc-sdk-ng";

// Video Call Components
import VideoCallLayout from "@/components/video-call/VideoCallLayout";
import VideoCallProvider from "@/components/video-call/VideoCallProvider";
import { VideoCallState } from "@/components/video-call/types";
import PreCallScreen from "@/components/video-call/PreCallScreen";

export default function MeetingPage() {
  const { id: sessionId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { subscribeToConversation } = useRealtime();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPreCall, setShowPreCall] = useState<boolean>(true);
  const [isJoining, setIsJoining] = useState<boolean>(false);
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
  const [conversationId, setConversationId] = useState<string>("");
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  
  const initRef = useRef<boolean>(false);
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
          
          // Subscribe to real-time updates for this conversation
          if (data.session.conversation_id) {
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
        fetchedSessionRef.current = false;
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessionDetails();
  }, [sessionId, user, subscribeToConversation]);

  // Initialize Agora client
  const initializeAgora = async () => {
    if (initRef.current || isConnected || !conversationId) return;
    
    try {
      setShowPreCall(false);
      initRef.current = true;
        
      // Configure Agora logging
      if (process.env.NODE_ENV === 'production') {
        AgoraRTC.setLogLevel(1);
        AgoraRTC.disableLogUpload();
      } else {
        AgoraRTC.setLogLevel(1);
        AgoraRTC.disableLogUpload();
      }
      
      // Create Agora client
      const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      
      // Configure client to reduce stats collection errors
      agoraClient.setClientRole("host");
      
      setClient(agoraClient);

      // Generate a consistent UID for this user and session
      const uidSource = `${user?.id}-${sessionId}`;
      const numericUid = parseInt(uidSource.replace(/\D/g, '').slice(0, 8)) || Math.floor(Math.random() * 100000);
      userUidRef.current = numericUid;
      
      // Fetch token from server
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
          await agoraClient.subscribe(remoteUser, mediaType);
          
          if (mediaType === "video") {
            setRemoteUsers(prev => {
              const existingUser = prev.find(user => user.uid === remoteUser.uid);
              const hasAudio = existingUser ? existingUser.hasAudio : false;
              const updatedUser = { 
                ...remoteUser,
                hasVideo: true,
                hasAudio: hasAudio 
              };
              
              const existingUsers = prev.filter(user => user.uid !== remoteUser.uid);
              return [...existingUsers, updatedUser];
            });
          }
          
          if (mediaType === "audio") {
            setRemoteUsers(prev => {
              const existingUser = prev.find(user => user.uid === remoteUser.uid);
              const hasVideo = existingUser ? existingUser.hasVideo : false;
              const updatedUser = { 
                ...remoteUser,
                hasAudio: true, 
                hasVideo: hasVideo 
              };
              
              const existingUsers = prev.filter(user => user.uid !== remoteUser.uid);
              return [...existingUsers, updatedUser];
            });
            
            if (remoteUser.audioTrack) {
              remoteUser.audioTrack.play();
            }
          }
        } catch (error) {
          console.error("Error handling user-published:", error);
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

      // Join channel
      await agoraClient.join(
        process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
        sessionId as string,
        data.token,
        numericUid
      );

      // Use existing tracks from pre-call screen or create new ones
      let audioTrack = localAudioTrack;
      let videoTrack = localVideoTrack;
      
      if (!audioTrack || !videoTrack) {
        // Fallback: create new tracks if not provided from pre-call
        const [newAudioTrack, newVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        audioTrack = newAudioTrack;
        videoTrack = newVideoTrack;
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
      }
      
      await agoraClient.publish([audioTrack, videoTrack]);
      
      // Apply the mute states from pre-call screen
      if (audioTrack) {
        audioTrack.setEnabled(!isAudioMuted);
      }
      if (videoTrack) {
        videoTrack.setEnabled(!isVideoMuted);
      }
      
      setIsConnected(true);
      setIsJoining(false);

      // Define cleanup function
      const cleanup = async () => {
        try {
          if (cleanupRef.current === null) return;
          
          if (screenTrack) {
            screenTrack.close();
            setScreenTrack(null);
          }
          
          if (localAudioTrack) {
            try {
              localAudioTrack.close();
            } catch (audioErr) {
              console.error("Error closing audio track:", audioErr);
            }
            setLocalAudioTrack(null);
          }
          
          if (localVideoTrack) {
            try {
              localVideoTrack.close();
            } catch (videoErr) {
              console.error("Error closing video track:", videoErr);
            }
            setLocalVideoTrack(null);
          }
          
          if (agoraClient) {
            try {
              await agoraClient.leave();
            } catch (leaveErr) {
              console.error("Error leaving channel:", leaveErr);
            }
            setClient(null);
          }
          
          setIsConnected(false);
          initRef.current = false;
          cleanupRef.current = null;
        } catch (err) {
          console.error("Error in cleanup:", err);
          cleanupRef.current = null;
          setClient(null);
          setLocalAudioTrack(null);
          setLocalVideoTrack(null);
          setScreenTrack(null);
          setIsConnected(false);
          initRef.current = false;
        }
      };
      
      cleanupRef.current = cleanup;
      
    } catch (error) {
      toast({
        title: "Error joining meeting",
        description: "There was a problem connecting to the video call.",
        variant: "destructive",
      });
      initRef.current = false;
      setIsJoining(false);
      setShowPreCall(true); // Return to pre-call screen on error
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Handle pre-call actions
  const handleJoinCall = (settings: {
    audioTrack: IMicrophoneAudioTrack;
    videoTrack: ICameraVideoTrack;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
  }) => {
    // Store the pre-call settings
    setLocalAudioTrack(settings.audioTrack);
    setLocalVideoTrack(settings.videoTrack);
    setIsAudioMuted(settings.isAudioMuted);
    setIsVideoMuted(settings.isVideoMuted);
    
    setIsJoining(true);
    initializeAgora();
  };

  const handleBack = () => {
    router.push('/dashboard/messages');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111]">
        <Loader2 className="h-10 w-10 animate-spin text-[#00AEFC]" />
        <p className="mt-4 text-lg text-white">Loading meeting...</p>
      </div>
    );
  }

  // Show joining state
  if (isJoining) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111]">
        <Loader2 className="h-10 w-10 animate-spin text-[#00AEFC]" />
        <p className="mt-4 text-lg text-white">Joining meeting...</p>
        <p className="mt-2 text-sm text-gray-400">Please wait while we connect you</p>
      </div>
    );
  }

  // Show pre-call screen
  if (showPreCall) {
    return (
      <PreCallScreen 
        sessionId={sessionId as string} 
        userName={user?.email?.split('@')[0]}
        onJoinCall={handleJoinCall}
        onBack={handleBack}
      />
    );
  }

  // Create video call state
  const videoCallState: VideoCallState = {
    client,
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    screenTrack,
    isConnected,
    channelName,
    conversationId,
    messages,
    isLoadingMessages,
    user,
    sessionId: sessionId as string,
    onToggleAudio: () => {
      if (!localAudioTrack) return;
      const newMuteState = !isAudioMuted;
      localAudioTrack.setEnabled(!newMuteState);
      setIsAudioMuted(newMuteState);
    },
    onToggleVideo: () => {
      if (!localVideoTrack) return;
      const newMuteState = !isVideoMuted;
      localVideoTrack.setEnabled(!newMuteState);
      setIsVideoMuted(newMuteState);
    },
    onToggleScreenSharing: async () => {
      if (!client) return;
      // Screen sharing logic will be implemented in the provider
    },
    onEndCall: async () => {
      try {
        setIsConfirmExitEnabled(false);
        if (cleanupRef.current) {
          await cleanupRef.current();
        }
        router.push('/dashboard/messages');
      } catch (error) {
        router.push('/dashboard/messages');
      }
    },
    onSendMessage: async (content: string) => {
      // Message sending logic will be implemented in the provider
    }
  };

  return (
    <VideoCallProvider value={videoCallState}>
      <VideoCallLayout />
    </VideoCallProvider>
  );
}