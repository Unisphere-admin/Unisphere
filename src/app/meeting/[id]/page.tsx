"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { toast } from "@/components/ui/use-toast";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { Loader2 } from "lucide-react";
// Types only - no runtime bundle cost
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";
import type { VideoCallState } from "@/components/video-call/types";

// Dynamically import heavy video-call components with ssr:false so the
// Agora SDK (and all its WebRTC machinery) is never bundled for the server
// and only loads client-side when the user actually enters a meeting.
const VideoCallLayout = dynamic(
  () => import("@/components/video-call/VideoCallLayout"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div> }
);
const VideoCallProvider = dynamic(
  () => import("@/components/video-call/VideoCallProvider"),
  { ssr: false }
);
const PreCallScreen = dynamic(
  () => import("@/components/video-call/PreCallScreen"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div> }
);

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
  const [localAudioTrack, setLocalAudioTrack] =
    useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ICameraVideoTrack | null>(null);
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
  const [isConfirmExitEnabled, setIsConfirmExitEnabled] =
    useState<boolean>(false);

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

        const response = await fetch(
          `/api/tutoring-sessions?session_id=${sessionId}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to fetch session details: ${response.status} ${
              errorData.error || ""
            }`
          );
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
            description:
              "Session not found or you don't have permission to access it",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Could not load session details",
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

      // Dynamically import Agora SDK - only loaded when the user actually joins
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

      // Configure Agora logging
      AgoraRTC.setLogLevel(1);
      AgoraRTC.disableLogUpload();

      // Create Agora client
      const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

      // Configure client to reduce stats collection errors
      agoraClient.setClientRole("host");

      setClient(agoraClient);

      // Generate a consistent UID for this user and session
      const uidSource = `${user?.id}-${sessionId}`;
      const numericUid =
        parseInt(uidSource.replace(/\D/g, "").slice(0, 8)) ||
        Math.floor(Math.random() * 100000);
      userUidRef.current = numericUid;

      // Fetch token from server
      const response = await fetch(
        `/api/agora/token?channelName=${sessionId}&uid=${numericUid}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get token");
      }

      setToken(data.token);
      setChannelName(sessionId as string);

      // Set up event listeners
      // Helper function to play audio with retry logic
      const playRemoteAudioWithRetry = async (
        audioTrack: any,
        uid: number | string,
        retries = 3
      ) => {
        for (let i = 0; i < retries; i++) {
          try {
            if (audioTrack && typeof audioTrack.play === "function") {
              await audioTrack.play();
              return true;
            }
          } catch (error) {
            console.warn(
              `Attempt ${i + 1} failed to play audio for user ${uid}:`,
              error
            );
            if (i < retries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }
        console.error(`Failed to play audio for user ${uid} after ${retries} attempts`);
        return false;
      };

      agoraClient.on("user-published", async (remoteUser, mediaType) => {
        try {
          await agoraClient.subscribe(remoteUser, mediaType);

          if (mediaType === "video") {
            setRemoteUsers((prev) => {
              const existingUser = prev.find(
                (user) => user.uid === remoteUser.uid
              );
              const updatedUser = {
                uid: remoteUser.uid,
                hasVideo: true,
                hasAudio: existingUser ? existingUser.hasAudio : false,
                videoTrack: remoteUser.videoTrack,
                audioTrack: existingUser ? existingUser.audioTrack : undefined,
              };

              const existingUsers = prev.filter(
                (user) => user.uid !== remoteUser.uid
              );
              return [...existingUsers, updatedUser];
            });
          }

          if (mediaType === "audio") {
            setRemoteUsers((prev) => {
              const existingUser = prev.find(
                (user) => user.uid === remoteUser.uid
              );
              const updatedUser = {
                uid: remoteUser.uid,
                hasAudio: true,
                hasVideo: existingUser ? existingUser.hasVideo : false,
                audioTrack: remoteUser.audioTrack,
                videoTrack: existingUser ? existingUser.videoTrack : undefined,
              };

              const existingUsers = prev.filter(
                (user) => user.uid !== remoteUser.uid
              );
              return [...existingUsers, updatedUser];
            });

            if (remoteUser.audioTrack) {
              await playRemoteAudioWithRetry(
                remoteUser.audioTrack,
                remoteUser.uid
              );
            }
          }
        } catch (error) {
          console.error("Error handling user-published:", error);
        }
      });

      agoraClient.on("user-unpublished", (remoteUser, mediaType) => {
        if (mediaType === "video") {
          setRemoteUsers((prev) =>
            prev.map((user) =>
              user.uid === remoteUser.uid ? { ...user, hasVideo: false } : user
            )
          );
        }
        if (mediaType === "audio") {
          setRemoteUsers((prev) =>
            prev.map((user) =>
              user.uid === remoteUser.uid ? { ...user, hasAudio: false } : user
            )
          );
        }
      });

      agoraClient.on("user-left", (remoteUser) => {
        setRemoteUsers((prev) =>
          prev.filter((user) => user.uid !== remoteUser.uid)
        );
      });

      agoraClient.on("connection-state-change", (state, prevState, reason) => {
        if (state === "CONNECTED") {
          setIsConnected(true);
          // Re-play all remote audio tracks after reconnection
          setRemoteUsers((prev) => {
            prev.forEach((user) => {
              if (user.audioTrack && user.hasAudio) {
                playRemoteAudioWithRetry(user.audioTrack, user.uid);
              }
            });
            return prev;
          });
        } else if (state === "DISCONNECTED") {
          setIsConnected(false);
        } else if (state === "RECONNECTING") {
          toast({
            title: "Connection Issue",
            description: "Reconnecting to the call...",
            duration: 3000,
          });
        }
      });

      // Handle network quality changes to detect potential audio issues
      agoraClient.on("network-quality", (stats) => {
        // Log significant network quality issues
        if (stats.downlinkNetworkQuality >= 4) {
          console.warn(
            "Poor downlink quality detected:",
            stats.downlinkNetworkQuality
          );
        }
        if (stats.uplinkNetworkQuality >= 4) {
          console.warn(
            "Poor uplink quality detected:",
            stats.uplinkNetworkQuality
          );
        }
      });

      // Handle exceptions from the Agora SDK
      agoraClient.on("exception", (event) => {
        console.error("Agora exception:", event.code, event.msg);
        // Audio-related error codes
        if (
          event.code === 1001 ||
          event.code === 1002 ||
          event.code === 1003
        ) {
          console.warn("Audio-related exception detected, may cause audio issues");
        }
      });

      // Handle user info updates (mute/unmute events)
      agoraClient.on("user-info-updated", (uid, msg) => {
        if (msg === "mute-audio" || msg === "unmute-audio") {
          setRemoteUsers((prev) =>
            prev.map((user) => {
              if (user.uid === uid) {
                const hasAudio = msg === "unmute-audio";
                // Re-play audio if unmuted
                if (hasAudio && user.audioTrack) {
                  playRemoteAudioWithRetry(user.audioTrack, uid);
                }
                return { ...user, hasAudio };
              }
              return user;
            })
          );
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
        const [newAudioTrack, newVideoTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();
        audioTrack = newAudioTrack;
        videoTrack = newVideoTrack;
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
      }

      // IMPORTANT: Enable tracks BEFORE publishing so they're active when published
      if (audioTrack) {
        await audioTrack.setEnabled(!isAudioMuted);
      }
      if (videoTrack) {
        await videoTrack.setEnabled(!isVideoMuted);
      }

      // Publish tracks to the channel
      await agoraClient.publish([audioTrack, videoTrack]);

      // Verify tracks are published
      const publishedTracks = agoraClient.localTracks;
      const hasAudioPublished = publishedTracks.some(
        (t) => t.trackMediaType === "audio"
      );
      const hasVideoPublished = publishedTracks.some(
        (t) => t.trackMediaType === "video"
      );

      if (!hasAudioPublished && audioTrack) {
        console.warn("Audio track not detected, attempting republish...");
        try {
          await agoraClient.publish(audioTrack);
        } catch (republishErr) {
          console.error("Failed to republish audio:", republishErr);
        }
      }

      // Monitor local audio track for issues
      if (audioTrack) {
        // Listen for track ended event (microphone disconnected, etc.)
        audioTrack.on("track-ended", () => {
          console.error("Local audio track ended unexpectedly");
          toast({
            title: "Microphone Disconnected",
            description:
              "Your microphone was disconnected. Please check your device.",
            variant: "destructive",
          });
        });

        // Check audio track state periodically
        const audioMonitor = setInterval(async () => {
          if (!audioTrack || !agoraClient) {
            clearInterval(audioMonitor);
            return;
          }

          try {
            const currentTracks = agoraClient.localTracks;
            const isAudioStillPublished = currentTracks.some(
              (t) => t.trackMediaType === "audio"
            );

            if (!isAudioStillPublished && !isAudioMuted) {
              console.warn("Audio track no longer published, republishing...");
              await agoraClient.publish(audioTrack);
            }
          } catch (err) {
            console.error("Audio monitor error:", err);
          }
        }, 10000); // Check every 10 seconds

        // Store interval for cleanup
        (window as any).__audioMonitorInterval = audioMonitor;
      }

      setIsConnected(true);
      setIsJoining(false);

      // Define cleanup function
      const cleanup = async () => {
        try {
          if (cleanupRef.current === null) return;

          // Clear audio monitor interval
          if ((window as any).__audioMonitorInterval) {
            clearInterval((window as any).__audioMonitorInterval);
            (window as any).__audioMonitorInterval = null;
          }

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

  // Periodic audio health check - monitors and recovers audio playback
  useEffect(() => {
    if (!isConnected || remoteUsers.length === 0) return;

    const audioHealthCheck = setInterval(() => {
      remoteUsers.forEach((user) => {
        if (user.audioTrack && user.hasAudio) {
          // Check if the audio track is still in a playable state
          const track = user.audioTrack as any;
          const isPlaying = track._player?.isPlaying || track.isPlaying;

          // If audio should be playing but isn't, try to restart it
          if (!isPlaying && track.play) {
            try {
              track.play();
            } catch (err) {
              console.warn(
                `Failed to restart audio for user ${user.uid}:`,
                err
              );
            }
          }
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(audioHealthCheck);
  }, [isConnected, remoteUsers]);

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
    router.push("/dashboard/messages");
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
        <p className="mt-2 text-sm text-gray-400">
          Please wait while we connect you
        </p>
      </div>
    );
  }

  // Show pre-call screen
  if (showPreCall) {
    return (
      <PreCallScreen
        sessionId={sessionId as string}
        userName={user?.email?.split("@")[0]}
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
    onToggleAudio: async () => {
      if (!localAudioTrack) {
        console.error("No local audio track available");
        return;
      }
      const newMuteState = !isAudioMuted;

      try {
        await localAudioTrack.setEnabled(!newMuteState);

        // If unmuting, verify the track is still published
        if (!newMuteState && client) {
          const publishedTracks = client.localTracks;
          const isAudioPublished = publishedTracks.some(
            (t) => t.trackMediaType === "audio"
          );

          if (!isAudioPublished) {
            console.warn("Audio track not published, republishing...");
            await client.publish(localAudioTrack);
          }
        }

        setIsAudioMuted(newMuteState);
      } catch (err) {
        console.error("Error toggling audio:", err);
      }
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
        router.push("/dashboard/messages");
      } catch (error) {
        router.push("/dashboard/messages");
      }
    },
    onSendMessage: async (content: string) => {
      // Message sending logic will be implemented in the provider
    },
  };

  return (
    <VideoCallProvider value={videoCallState}>
      <VideoCallLayout />
    </VideoCallProvider>
  );
}
