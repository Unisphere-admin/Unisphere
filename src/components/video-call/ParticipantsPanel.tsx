"use client";

import React from 'react';
import { useVideoCall } from './VideoCallProvider';
import { SidePanelProps } from './types';
import { X, Mic, MicOff, Video, VideoOff, Crown, User } from 'lucide-react';

const ParticipantsPanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title }) => {
  const { remoteUsers, user, isAudioMuted, isVideoMuted } = useVideoCall();

  if (!isOpen) return null;

  const allParticipants = [
    {
      id: user?.id || 'local',
      name: user?.email?.split('@')[0] || 'You',
      isLocal: true,
      isHost: true, // Local user is always host for now
      hasAudio: !isAudioMuted,
      hasVideo: !isVideoMuted,
      avatar: user?.email?.charAt(0).toUpperCase() || 'G'
    },
    ...remoteUsers.map(remoteUser => ({
      id: remoteUser.uid.toString(),
      name: `Participant ${remoteUser.uid}`,
      isLocal: false,
      isHost: false,
      hasAudio: remoteUser.hasAudio,
      hasVideo: remoteUser.hasVideo,
      avatar: remoteUser.uid.toString().charAt(0).toUpperCase()
    }))
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#1D1D1D] border-l border-[#333333] flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#333333]">
        <h3 className="text-white font-semibold">Participants ({allParticipants.length})</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-[#222222] hover:bg-[#333333] rounded-full flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      
      {/* Participants list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {allParticipants.map((participant) => (
            <div 
              key={participant.id}
              className="flex items-center space-x-3 p-3 bg-[#222222] rounded-lg"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-[#00AEFC] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {participant.avatar}
                </span>
              </div>
              
              {/* Participant info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium truncate">
                    {participant.name}
                  </span>
                  {participant.isHost && (
                    <Crown className="h-4 w-4 text-[#FFAB00]" />
                  )}
                  {participant.isLocal && (
                    <span className="text-xs bg-[#00AEFC] text-white px-2 py-1 rounded-full">
                      You
                    </span>
                  )}
                </div>
              </div>
              
              {/* Status indicators */}
              <div className="flex items-center space-x-2">
                {/* Audio status */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  participant.hasAudio ? 'bg-[#36B37E]' : 'bg-[#FF414D]'
                }`}>
                  {participant.hasAudio ? (
                    <Mic className="h-4 w-4 text-white" />
                  ) : (
                    <MicOff className="h-4 w-4 text-white" />
                  )}
                </div>
                
                {/* Video status */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  participant.hasVideo ? 'bg-[#36B37E]' : 'bg-[#FF414D]'
                }`}>
                  {participant.hasVideo ? (
                    <Video className="h-4 w-4 text-white" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Empty state */}
        {allParticipants.length === 0 && (
          <div className="text-center py-8 text-[#808080]">
            <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-[#808080]" />
            </div>
            <p className="text-lg">No participants</p>
            <p className="text-sm">Waiting for others to join...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantsPanel;
