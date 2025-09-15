"use client";

import React from 'react';
import { useVideoCall } from './VideoCallProvider';
import { Users, Clock, Shield } from 'lucide-react';

const TopNavbar: React.FC = () => {
  const { channelName, remoteUsers, user } = useVideoCall();

  return (
    <div className="h-16 bg-[#1D1D1D] border-b border-[#333333] flex items-center justify-between px-6">
      {/* Left side - Meeting info */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#00AEFC] rounded-full"></div>
          <span className="text-white text-sm font-medium">Live</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-[#808080]" />
          <span className="text-white text-sm">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-[#808080]" />
          <span className="text-white text-sm">{remoteUsers.length + 1} participants</span>
        </div>
      </div>
      
      {/* Center - Meeting title */}
      <div className="flex-1 flex justify-center">
        <div className="text-center">
          <h1 className="text-white text-lg font-semibold">
            {channelName ? `Meeting: ${channelName}` : 'Video Call'}
          </h1>
          <p className="text-[#808080] text-sm">
            {user?.email || 'Guest'}
          </p>
        </div>
      </div>
      
      {/* Right side - Security indicator */}
      <div className="flex items-center space-x-2">
        <Shield className="h-4 w-4 text-[#36B37E]" />
        <span className="text-[#36B37E] text-sm font-medium">Secure</span>
      </div>
    </div>
  );
};

export default TopNavbar;
