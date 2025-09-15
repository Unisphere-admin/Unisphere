"use client";

import React from 'react';
import { VideoTileProps } from './types';
import { Mic, MicOff, Video, VideoOff, Crown } from 'lucide-react';

const VideoTile: React.FC<VideoTileProps> = ({ user, isLocal, isScreenSharing }) => {
  return (
    <div className="relative w-full h-full bg-[#222222] rounded-lg overflow-hidden">
      {/* Video content */}
      <div className="w-full h-full">
        {user.hasVideo ? (
          <div 
            id={`remote-video-${user.uid}`}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 bg-[#333333] rounded-full flex items-center justify-center">
              <span className="text-3xl text-[#808080]">
                {user.uid.toString().charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay with user info and controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
        {/* Top left - User info */}
        <div className="absolute top-3 left-3 flex items-center space-x-2">
          {isLocal && (
            <span className="text-xs bg-[#00AEFC] text-white px-2 py-1 rounded-full">
              You
            </span>
          )}
          <span className="text-white text-sm font-medium">
            {isLocal ? 'You' : `Participant ${user.uid}`}
          </span>
          {isScreenSharing && (
            <div className="flex items-center space-x-1 text-[#00AEFC]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Screen</span>
            </div>
          )}
        </div>
        
        {/* Top right - Status indicators */}
        <div className="absolute top-3 right-3 flex items-center space-x-2">
          {/* Audio status */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            user.hasAudio ? 'bg-[#36B37E]' : 'bg-[#FF414D]'
          }`}>
            {user.hasAudio ? (
              <Mic className="h-4 w-4 text-white" />
            ) : (
              <MicOff className="h-4 w-4 text-white" />
            )}
          </div>
          
          {/* Video status */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            user.hasVideo ? 'bg-[#36B37E]' : 'bg-[#FF414D]'
          }`}>
            {user.hasVideo ? (
              <Video className="h-4 w-4 text-white" />
            ) : (
              <VideoOff className="h-4 w-4 text-white" />
            )}
          </div>
        </div>
        
        {/* Bottom left - Additional info */}
        <div className="absolute bottom-3 left-3">
          {isScreenSharing && (
            <div className="bg-[#00AEFC] text-white text-xs px-2 py-1 rounded">
              Screen Sharing
            </div>
          )}
        </div>
        
        {/* Bottom right - Host indicator */}
        <div className="absolute bottom-3 right-3">
          {isLocal && (
            <div className="flex items-center space-x-1 text-[#FFAB00]">
              <Crown className="h-4 w-4" />
              <span className="text-xs font-medium">Host</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
