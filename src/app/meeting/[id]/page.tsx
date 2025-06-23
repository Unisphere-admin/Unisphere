"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  Video as VideoIcon, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  ScreenShare,
  MessageSquare,
  Users
} from "lucide-react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  ILocalVideoTrack
} from "agora-rtc-sdk-ng";

// Define types for our state
interface UserState {
  uid: string | number;
  audio: boolean;
  video: boolean;
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
  const initRef = useRef<boolean>(false);

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
            // Subscribe to the remote user
            await agoraClient.subscribe(remoteUser, mediaType);
            
            if (mediaType === "video") {
              // Add the remote user to the state
              setRemoteUsers(prev => {
                // Check if user already exists
                if (prev.some(user => user.uid === remoteUser.uid)) {
                  return prev.map(user => 
                    user.uid === remoteUser.uid ? { ...remoteUser, hasVideo: true } : user
                  );
                } else {
                  return [...prev, { ...remoteUser, hasVideo: true }];
                }
              });
            }
            
            if (mediaType === "audio") {
              // Update remote user audio status
              setRemoteUsers(prev => {
                // Check if user already exists
                if (prev.some(user => user.uid === remoteUser.uid)) {
                  return prev.map(user => 
                    user.uid === remoteUser.uid ? { ...user, hasAudio: true } : user
                  );
                } else {
                  return [...prev, { ...remoteUser, hasAudio: true }];
                }
              });
              
              // Play audio automatically
              if (remoteUser.audioTrack) {
                remoteUser.audioTrack.play();
              }
            }
          } catch (error) {
            console.error("Error subscribing to remote user:", error);
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
          console.log("Connection state changed to:", state);
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
        localAudioTrack?.close();
        localVideoTrack?.close();
        screenTrack?.close();
        client.leave().then(() => {
          setIsConnected(false);
          initRef.current = false;
        }).catch(console.error);
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
    
    // Play all remote video tracks
    remoteUsers.forEach(user => {
      if (user && user.videoTrack && user.hasVideo) {
        const playerElement = document.getElementById(`remote-video-${user.uid}`);
        if (playerElement) {
          try {
            user.videoTrack.play(playerElement);
          } catch (error) {
            console.error(`Error playing video for user ${user.uid}:`, error);
          }
        }
      }
    });
  }, [remoteUsers]);

  const toggleAudio = async () => {
    if (!localAudioTrack) return;
    
    if (isAudioMuted) {
      await localAudioTrack.setEnabled(true);
      setIsAudioMuted(false);
    } else {
      await localAudioTrack.setEnabled(false);
      setIsAudioMuted(true);
    }
  };

  const toggleVideo = async () => {
    if (!localVideoTrack) return;
    
    if (isVideoMuted) {
      await localVideoTrack.setEnabled(true);
      setIsVideoMuted(false);
    } else {
      await localVideoTrack.setEnabled(false);
      setIsVideoMuted(true);
    }
  };

  const toggleScreenSharing = async () => {
    if (!client) return;

    if (!isScreenSharing) {
      try {
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
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error("Error sharing screen:", error);
        toast({
          title: "Screen sharing failed",
          description: "There was a problem starting screen sharing.",
          variant: "destructive",
        });
      }
    } else {
      // Unpublish screen track and publish camera track again
      if (screenTrack) {
        await client.unpublish(screenTrack);
        screenTrack.close();
        setScreenTrack(null);
      }
      
      if (localVideoTrack) {
        await client.publish(localVideoTrack);
      }
      
      setIsScreenSharing(false);
    }
  };

  const handleEndCall = async () => {
    try {
      // Close all tracks
      localAudioTrack?.close();
      localVideoTrack?.close();
      screenTrack?.close();
      
      // Leave the channel - client.leave() doesn't require arguments
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-2 py-1">
            <Users className="h-4 w-4 mr-1" />
            {remoteUsers.length + 1}
          </Badge>
          <h2 className="text-lg font-semibold">Session: {channelName}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleAudio}
          >
            {isAudioMuted ? (
              <MicOff className="h-5 w-5 text-red-500" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleVideo}
          >
            {isVideoMuted ? (
              <VideoOff className="h-5 w-5 text-red-500" />
            ) : (
              <VideoIcon className="h-5 w-5" />
            )}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleScreenSharing}
          >
            <ScreenShare className={`h-5 w-5 ${isScreenSharing ? "text-green-500" : ""}`} />
          </Button>
          <Button 
            variant="destructive" 
            size="icon"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local user video */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex items-center">
                <Badge variant="secondary" className="mr-2">You</Badge>
                {user?.name || "Me"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 aspect-video bg-gray-100 dark:bg-gray-800 relative">
              {isVideoMuted ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <VideoOff className="h-12 w-12 text-gray-400" />
                </div>
              ) : (
                <div id="local-video" className="h-full w-full">
                  {localVideoTrack && (
                    <div ref={el => {
                      if (el && !isVideoMuted) {
                        localVideoTrack.play(el);
                      }
                    }} className="h-full w-full" />
                  )}
                  {isScreenSharing && screenTrack && (
                    <div ref={el => {
                      if (el) {
                        screenTrack.play(el);
                      }
                    }} className="h-full w-full" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Remote users videos */}
          {Array.isArray(remoteUsers) && remoteUsers.length > 0 ? (
            remoteUsers.map(user => (
              <Card key={user.uid} className="overflow-hidden">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    <Badge variant="secondary" className="mr-2">User</Badge>
                    {user.uid}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 aspect-video bg-gray-100 dark:bg-gray-800 relative">
                  {!user.hasVideo ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <VideoOff className="h-12 w-12 text-gray-400" />
                    </div>
                  ) : (
                    <div id={`remote-video-${user.uid}`} className="h-full w-full"></div>
                  )}
                  {!user.hasAudio && (
                    <Badge variant="secondary" className="absolute bottom-2 left-2">
                      <MicOff className="h-3 w-3 mr-1" />
                      Muted
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              No remote users connected yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 