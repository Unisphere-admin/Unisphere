"use client";

import React from 'react';
import { Loader2, Video, Mic, Users } from 'lucide-react';

interface JoiningScreenProps {
  sessionId: string;
  userName?: string;
}

const JoiningScreen: React.FC<JoiningScreenProps> = ({ sessionId, userName }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#111111] to-[#1a1a1a]">
      {/* Main Content */}
      <div className="text-center max-w-md mx-auto px-6">
        {/* Logo/Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-[#00AEFC] to-[#0088CC] rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Joining Meeting
        </h1>
        
        <p className="text-gray-300 mb-6">
          {userName ? `Welcome, ${userName}!` : 'Welcome!'}
        </p>

        {/* Session Info */}
        <div className="bg-[#1e1e1e] rounded-lg p-4 mb-8 border border-[#333]">
          <p className="text-sm text-gray-400 mb-2">Session ID</p>
          <p className="text-white font-mono text-sm break-all">{sessionId}</p>
        </div>

        {/* Loading Animation */}
        <div className="flex items-center justify-center mb-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#00AEFC] mr-3" />
          <span className="text-white">Establishing connection...</span>
        </div>

        {/* Connection Steps */}
        <div className="space-y-3 text-left">
          <div className="flex items-center text-gray-300">
            <div className="w-2 h-2 bg-[#00AEFC] rounded-full mr-3 animate-pulse"></div>
            <span className="text-sm">Connecting to Agora servers</span>
          </div>
          <div className="flex items-center text-gray-300">
            <div className="w-2 h-2 bg-[#00AEFC] rounded-full mr-3 animate-pulse"></div>
            <span className="text-sm">Joining video channel</span>
          </div>
          <div className="flex items-center text-gray-300">
            <div className="w-2 h-2 bg-[#00AEFC] rounded-full mr-3 animate-pulse"></div>
            <span className="text-sm">Initializing media streams</span>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 bg-[#1e1e1e] rounded-lg border border-[#333]">
          <h3 className="text-white font-semibold mb-2 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Quick Tips
          </h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Ensure your camera and microphone are working</li>
            <li>• Check your internet connection is stable</li>
            <li>• Allow browser permissions when prompted</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoiningScreen;

