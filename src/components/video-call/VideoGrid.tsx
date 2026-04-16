"use client";

import React, { useEffect, useRef } from "react";
import { useVideoCall } from "./VideoCallProvider";
import VideoTile from "./VideoTile";

const VideoGrid: React.FC = () => {
  const {
    localVideoTrack,
    localAudioTrack,
    remoteUsers,
    isVideoMuted,
    isAudioMuted,
    screenTrack,
    isScreenSharing,
    user,
  } = useVideoCall();

  const localVideoRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<HTMLDivElement>(null);

  // Play local video
  useEffect(() => {
    if (
      localVideoRef.current &&
      localVideoTrack &&
      !isVideoMuted &&
      !isScreenSharing
    ) {
      try {
        // Clear any existing content
        localVideoRef.current.innerHTML = "";
        localVideoTrack.play(localVideoRef.current);
      } catch (error) {
        console.error("Error playing local video:", error);
      }
    }
  }, [localVideoTrack, isVideoMuted, isScreenSharing]);

  // Play screen share
  useEffect(() => {
    if (screenShareRef.current && screenTrack && isScreenSharing) {
      try {
        // Clear any existing content
        screenShareRef.current.innerHTML = "";
        screenTrack.play(screenShareRef.current);
      } catch (error) {
        console.error("Error playing screen share:", error);
      }
    }
  }, [screenTrack, isScreenSharing]);

  // Play remote videos
  useEffect(() => {
    remoteUsers.forEach((u, idx) => {
    });

    const playRemoteVideos = () => {
      remoteUsers.forEach((remoteUser) => {
        if (remoteUser.videoTrack && remoteUser.hasVideo) {
          const elementId = `remote-video-${remoteUser.uid}`;
          const element = document.getElementById(elementId);

          if (element) {
            try {
              // Clear any existing content
              element.innerHTML = "";
              remoteUser.videoTrack.play(element);
            } catch (error) {
              console.error(
                `Error playing remote video for user ${remoteUser.uid}:`,
                error
              );
            }
          } else {
            console.warn(
              `Element ${elementId} not found in DOM, will retry...`
            );
            // Retry after a short delay to allow DOM to update
            setTimeout(() => {
              const retryElement = document.getElementById(elementId);
              if (retryElement && remoteUser.videoTrack) {
                try {
                  retryElement.innerHTML = "";
                  remoteUser.videoTrack.play(retryElement);
                } catch (error) {
                  console.error(
                    `Error playing remote video for user ${remoteUser.uid} (retry):`,
                    error
                  );
                }
              } else {
                console.error(
                  `Element ${elementId} still not found after retry`
                );
              }
            }, 100);
          }
        }
      });
    };

    // Play immediately
    playRemoteVideos();

    // Also retry after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(playRemoteVideos, 50);

    return () => clearTimeout(timeoutId);
  }, [remoteUsers]);

  // Force re-render of local video when screen sharing stops
  useEffect(() => {
    if (
      !isScreenSharing &&
      localVideoRef.current &&
      localVideoTrack &&
      !isVideoMuted
    ) {
      // Small delay to ensure the track is properly restored
      setTimeout(() => {
        if (localVideoRef.current && localVideoTrack) {
          try {
            localVideoRef.current.innerHTML = "";
            localVideoTrack.play(localVideoRef.current);
          } catch (error) {
            console.error("Error restoring local video:", error);
          }
        }
      }, 100);
    }
  }, [isScreenSharing, localVideoTrack, isVideoMuted]);

  const totalParticipants = remoteUsers.length + 1;
  const isGridLayout = totalParticipants > 2;

  if (totalParticipants === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-white">
          <div className="w-32 h-32 bg-[#222222] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl text-[#808080]">
              {user?.email?.charAt(0).toUpperCase() || "G"}
            </span>
          </div>
          <p className="text-xl text-[#808080]">Waiting for others to join</p>
        </div>
      </div>
    );
  }

  if (totalParticipants === 1) {
    // Single participant - show local video large
    return (
      <div className="h-full flex items-center justify-center">
        <div className="relative w-full max-w-4xl aspect-video bg-[#222222] rounded-lg overflow-hidden">
          {/* Video element - always rendered */}
          <div ref={localVideoRef} className="w-full h-full" />

          {/* Screen share element */}
          {isScreenSharing && screenTrack && (
            <div
              ref={screenShareRef}
              className="absolute inset-0 w-full h-full"
            />
          )}

          {/* User icon overlay - covers video when camera is off */}
          {!isVideoMuted && !isScreenSharing ? null : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#222222]">
              <div className="w-32 h-32 bg-[#333333] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-6xl text-[#808080]">
                  {user?.email?.charAt(0).toUpperCase() || "G"}
                </span>
              </div>
            </div>
          )}

          {/* Audio mute indicator */}
          {isAudioMuted && (
            <div className="absolute top-4 right-4 bg-[#FF414D] rounded-full p-2">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  clipRule="evenodd"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            </div>
          )}

          {/* Screen sharing indicator */}
          {isScreenSharing && (
            <div className="absolute top-4 left-4 bg-[#00AEFC] text-white px-3 py-1 rounded-full text-sm font-medium">
              Screen Sharing
            </div>
          )}
        </div>
      </div>
    );
  }

  if (totalParticipants === 2) {
    // Two participants - side by side layout
    const remoteUser = remoteUsers[0];

    return (
      <div className="h-full flex space-x-4">
        {/* Local video */}
        <div className="flex-1 bg-[#222222] rounded-lg overflow-hidden relative min-h-0">
          {/* Video element - always rendered */}
          <div ref={localVideoRef} className="w-full h-full" />

          {/* Screen share element */}
          {isScreenSharing && screenTrack && (
            <div
              ref={screenShareRef}
              className="absolute inset-0 w-full h-full"
            />
          )}

          {/* User icon overlay - covers video when camera is off */}
          {!isVideoMuted && !isScreenSharing ? null : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#222222]">
              <div className="w-24 h-24 bg-[#333333] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-4xl text-[#808080]">
                  {user?.email?.charAt(0).toUpperCase() || "G"}
                </span>
              </div>
            </div>
          )}

          {/* Audio mute indicator */}
          {isAudioMuted && (
            <div className="absolute top-4 right-4 bg-[#FF414D] rounded-full p-2">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  clipRule="evenodd"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            </div>
          )}

          {/* Screen sharing indicator */}
          {isScreenSharing && (
            <div className="absolute top-4 left-4 bg-[#00AEFC] text-white px-2 py-1 rounded text-xs font-medium">
              Screen
            </div>
          )}
        </div>

        {/* Remote video */}
        <div className="flex-1 bg-[#222222] rounded-lg overflow-hidden relative min-h-0">
          {/* Remote video element - always rendered */}
          {remoteUser && (
            <div
              id={`remote-video-${remoteUser.uid}`}
              className="w-full h-full"
            />
          )}

          {/* User icon overlay - covers video when remote user has no video */}
          {remoteUser && remoteUser.hasVideo ? null : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#222222]">
              <div className="w-24 h-24 bg-[#333333] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-4xl text-[#808080]">
                  {remoteUser?.uid.toString().charAt(0).toUpperCase() || "O"}
                </span>
              </div>
            </div>
          )}

          {/* Audio mute indicator */}
          {remoteUser && !remoteUser.hasAudio && (
            <div className="absolute top-4 right-4 bg-[#FF414D] rounded-full p-2">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  clipRule="evenodd"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid layout for 3+ participants
  return (
    <div className="h-full">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Local video - larger */}
        <div className="bg-[#222222] rounded-lg overflow-hidden relative min-h-0">
          {/* Video element - always rendered */}
          <div ref={localVideoRef} className="w-full h-full" />

          {/* Screen share element */}
          {isScreenSharing && screenTrack && (
            <div
              ref={screenShareRef}
              className="absolute inset-0 w-full h-full"
            />
          )}

          {/* User icon overlay - covers video when camera is off */}
          {!isVideoMuted && !isScreenSharing ? null : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#222222]">
              <div className="w-24 h-24 bg-[#333333] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-4xl text-[#808080]">
                  {user?.email?.charAt(0).toUpperCase() || "G"}
                </span>
              </div>
            </div>
          )}

          {/* Audio mute indicator */}
          {isAudioMuted && (
            <div className="absolute top-2 right-2 bg-[#FF414D] rounded-full p-1">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  clipRule="evenodd"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            </div>
          )}

          {/* Screen sharing indicator */}
          {isScreenSharing && (
            <div className="absolute top-2 left-2 bg-[#00AEFC] text-white px-2 py-1 rounded text-xs font-medium">
              Screen
            </div>
          )}
        </div>

        {/* Remote videos */}
        {remoteUsers.slice(0, 3).map((remoteUser, index) => (
          <div
            key={remoteUser.uid}
            className="bg-[#222222] rounded-lg overflow-hidden relative min-h-0"
          >
            {/* Remote video element - always rendered */}
            <div
              id={`remote-video-${remoteUser.uid}`}
              className="w-full h-full"
            />

            {/* User icon overlay - covers video when remote user has no video */}
            {remoteUser.hasVideo ? null : (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#222222]">
                <div className="w-24 h-24 bg-[#333333] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-4xl text-[#808080]">
                    {remoteUser.uid.toString().charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Audio mute indicator */}
            {!remoteUser.hasAudio && (
              <div className="absolute top-2 right-2 bg-[#FF414D] rounded-full p-1">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    clipRule="evenodd"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}

        {/* More participants indicator */}
        {remoteUsers.length > 3 && (
          <div className="bg-[#222222] rounded-lg overflow-hidden flex items-center justify-center min-h-0">
            <div className="text-center text-white p-4">
              <div className="w-24 h-24 bg-[#333333] rounded-full flex items-center justify-center mx-auto mb-2 flex-shrink-0">
                <span className="text-2xl text-[#808080]">
                  +{remoteUsers.length - 3}
                </span>
              </div>
              <p className="text-sm text-[#808080]">More participants</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGrid;
