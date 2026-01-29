"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { VideoCallState } from './types';
import AgoraRTC, { ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import { toast } from '@/components/ui/use-toast';
import { createClient } from '@/utils/supabase/client';

// In-call message type (ephemeral, not persisted)
interface InCallMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    display_name: string;
  };
}

const VideoCallContext = createContext<VideoCallState | undefined>(undefined);

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (context === undefined) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};

interface VideoCallProviderProps {
  value: VideoCallState;
  children: React.ReactNode;
}

const VideoCallProvider: React.FC<VideoCallProviderProps> = ({ value, children }) => {
  const [isScreenSharing, setIsScreenSharing] = useState(value.isScreenSharing);
  const [screenTrack, setScreenTrack] = useState(value.screenTrack);
  const [inCallMessages, setInCallMessages] = useState<InCallMessage[]>([]);

  // Supabase real-time channel for in-call chat
  const supabaseRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // Initialize Supabase and subscribe to in-call chat channel
  useEffect(() => {
    if (!value.sessionId || !value.user) return;

    const supabase = createClient();
    supabaseRef.current = supabase;

    // Create a unique channel for this call's chat (separate from DM)
    const channelName = `incall_chat:${value.sessionId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'chat_message' }, (payload: { payload: InCallMessage }) => {
        const message = payload.payload;
        // Don't add duplicate messages
        setInCallMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to in-call chat channel:', channelName);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [value.sessionId, value.user]);

  // Cleanup effect when provider unmounts
  useEffect(() => {
    return () => {
      // Cleanup screen track if it exists
      if (screenTrack) {
        try {
          screenTrack.close();
        } catch (err) {
          console.error('Error closing screen track during cleanup:', err);
        }
      }
    };
  }, [screenTrack]);

  // Enhanced screen sharing functionality
  const handleToggleScreenSharing = async () => {
    if (!value.client) return;

    try {
      if (!isScreenSharing) {
        console.log('Starting screen sharing...');
        
        // Start screen sharing with better configuration
        const screenTracks = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: "1080p_1"
        });
        
        const videoTrack = Array.isArray(screenTracks) ? screenTracks[0] : screenTracks;
        setScreenTrack(videoTrack);
        
        // Unpublish camera track and publish screen track
        if (value.localVideoTrack) {
          console.log('Unpublishing camera track...');
          await value.client.unpublish(value.localVideoTrack);
        }
        
        console.log('Publishing screen track...');
        await value.client.publish(videoTrack);
        
        // Add screen sharing ended event listener
        videoTrack.on("track-ended", async () => {
          console.log('Screen sharing track ended, stopping screen sharing');
          await stopScreenSharing();
        });
        
        setIsScreenSharing(true);
        
        toast({
          title: "Screen Sharing Started",
          description: "Your screen is now being shared",
          duration: 2000,
        });
        
        console.log('Screen sharing started successfully');
      } else {
        await stopScreenSharing();
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
      
      // Provide more specific error messages
      let errorMessage = "There was a problem with screen sharing.";
      if (error instanceof Error) {
        if (error.message.includes('Permission')) {
          errorMessage = "Screen sharing permission denied. Please allow screen sharing access.";
        } else if (error.message.includes('NotSupportedError')) {
          errorMessage = "Screen sharing is not supported in this browser.";
        } else if (error.message.includes('NotAllowedError')) {
          errorMessage = "Screen sharing was cancelled or denied.";
        }
      }
      
      toast({
        title: "Screen sharing failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopScreenSharing = async () => {
    if (!value.client) return;
    
    try {
      console.log('Stopping screen sharing...');
      
      // Unpublish screen track
      if (screenTrack) {
        await value.client.unpublish(screenTrack);
        screenTrack.close();
        setScreenTrack(null);
      }
      
      // Always republish camera track when screen sharing stops
      if (value.localVideoTrack) {
        console.log('Republishing camera track...');
        await value.client.publish(value.localVideoTrack);
        
        // If video was not muted before screen sharing, ensure it's enabled
        if (!value.isVideoMuted) {
          await value.localVideoTrack.setEnabled(true);
        }
        
        // Force a small delay to ensure the track is properly restored
        setTimeout(async () => {
          try {
            if (value.localVideoTrack && value.client) {
              // Check if the track is still valid and republish if needed
              const currentTracks = value.client.localTracks;
              const isStillPublished = currentTracks.some(track => 
                track.trackMediaType === "video" && 
                (track as any).trackId === (value.localVideoTrack as any)?.trackId
              );
              
              if (!isStillPublished) {
                await value.client.publish(value.localVideoTrack);
              }
            }
          } catch (err) {
            console.error('Error ensuring video track is published:', err);
          }
        }, 200);
      }
      
      setIsScreenSharing(false);
      
      toast({
        title: "Screen Sharing Stopped",
        description: "Camera view restored",
        duration: 2000,
      });
      
      console.log('Screen sharing stopped successfully');
    } catch (error) {
      console.error('Error stopping screen sharing:', error);
      
      // Force cleanup in case of error
      if (screenTrack) {
        try {
          screenTrack.close();
        } catch (closeError) {
          console.error('Error closing screen track:', closeError);
        }
        setScreenTrack(null);
      }
      setIsScreenSharing(false);
      
      // Try to restore camera track
      try {
        if (value.localVideoTrack && value.client) {
          await value.client.publish(value.localVideoTrack);
          if (!value.isVideoMuted) {
            await value.localVideoTrack.setEnabled(true);
          }
        }
      } catch (restoreError) {
        console.error('Error restoring camera track:', restoreError);
      }
      
      toast({
        title: "Error stopping screen sharing",
        description: "Camera may need to be manually enabled",
        variant: "destructive",
      });
    }
  };

  // In-call chat message sending (ephemeral, uses real-time broadcast)
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !value.user || !channelRef.current) return;

    const message: InCallMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      sender_id: value.user.id,
      created_at: new Date().toISOString(),
      sender: {
        display_name: value.user.email?.split('@')[0] || 'You',
      },
    };

    try {
      // Add message to local state immediately (optimistic update)
      setInCallMessages((prev) => [...prev, message]);

      // Broadcast to other participants
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: message,
      });
    } catch (error) {
      console.error('Error sending in-call message:', error);
      toast({
        title: "Error",
        description: "Could not send message",
        variant: "destructive",
      });
    }
  }, [value.user]);

  // Create enhanced context value
  const enhancedValue: VideoCallState = {
    ...value,
    isScreenSharing,
    screenTrack,
    messages: inCallMessages, // Use in-call messages instead of DM messages
    isLoadingMessages: false, // In-call messages are always ready
    onToggleScreenSharing: handleToggleScreenSharing,
    onSendMessage: handleSendMessage,
  };

  return (
    <VideoCallContext.Provider value={enhancedValue}>
      {children}
    </VideoCallContext.Provider>
  );
};

export default VideoCallProvider;
