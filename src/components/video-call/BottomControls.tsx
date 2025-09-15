"use client";

import React from 'react';
import { useVideoCall } from './VideoCallProvider';
import { SidePanelType } from './VideoCallLayout';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Share2, 
  MessageSquare, 
  Users, 
  Settings,
  MoreVertical,
  Activity
} from 'lucide-react';

interface BottomControlsProps {
  onToggleSidePanel: (type: SidePanelType) => void;
  activeSidePanel: SidePanelType;
}

const BottomControls: React.FC<BottomControlsProps> = ({ 
  onToggleSidePanel, 
  activeSidePanel 
}) => {
  const { 
    isAudioMuted, 
    isVideoMuted, 
    isScreenSharing,
    onToggleAudio, 
    onToggleVideo, 
    onToggleScreenSharing,
    onEndCall 
  } = useVideoCall();

  return (
    <div className="bg-[#1D1D1D] border-t border-[#333333] px-6 py-4">
      <div className="flex items-center justify-center space-x-4">
        {/* Audio toggle */}
        <button
          onClick={onToggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isAudioMuted 
              ? 'bg-[#FF414D] hover:bg-[#E63946]' 
              : 'bg-[#222222] hover:bg-[#333333]'
          }`}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
        >
          {isAudioMuted ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </button>
        
        {/* Video toggle */}
        <button
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isVideoMuted 
              ? 'bg-[#FF414D] hover:bg-[#E63946]' 
              : 'bg-[#222222] hover:bg-[#333333]'
          }`}
          title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoMuted ? (
            <VideoOff className="h-6 w-6 text-white" />
          ) : (
            <Video className="h-6 w-6 text-white" />
          )}
        </button>
        
        {/* Screen sharing */}
        <button
          onClick={onToggleScreenSharing}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing 
              ? 'bg-[#00AEFC] hover:bg-[#0095E0]' 
              : 'bg-[#222222] hover:bg-[#333333]'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <Share2 className="h-6 w-6 text-white" />
        </button>
        
        {/* End call */}
        <button
          onClick={onEndCall}
          className="w-16 h-16 bg-[#FF414D] hover:bg-[#E63946] rounded-full flex items-center justify-center transition-colors"
          title="End call"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
        
        {/* Side panel toggles */}
        <div className="flex space-x-2">
          <button
            onClick={() => onToggleSidePanel('participants')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              activeSidePanel === 'participants' 
                ? 'bg-[#00AEFC] hover:bg-[#0095E0]' 
                : 'bg-[#222222] hover:bg-[#333333]'
            }`}
            title="Participants"
          >
            <Users className="h-5 w-5 text-white" />
          </button>
          
          <button
            onClick={() => onToggleSidePanel('chat')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              activeSidePanel === 'chat' 
                ? 'bg-[#00AEFC] hover:bg-[#0095E0]' 
                : 'bg-[#222222] hover:bg-[#333333]'
            }`}
            title="Chat"
          >
            <MessageSquare className="h-5 w-5 text-white" />
          </button>
          
          <button
            onClick={() => onToggleSidePanel('settings')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              activeSidePanel === 'settings' 
                ? 'bg-[#00AEFC] hover:bg-[#0095E0]' 
                : 'bg-[#222222] hover:bg-[#333333]'
            }`}
            title="Settings"
          >
            <Settings className="h-5 w-5 text-white" />
          </button>
          
          <button
            onClick={() => onToggleSidePanel('network')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              activeSidePanel === 'network' 
                ? 'bg-[#00AEFC] hover:bg-[#0095E0]' 
                : 'bg-[#222222] hover:bg-[#333333]'
            }`}
            title="Network Statistics"
          >
            <Activity className="h-5 w-5 text-white" />
          </button>
        </div>
        
        {/* More options */}
        <button className="w-12 h-12 bg-[#222222] hover:bg-[#333333] rounded-full flex items-center justify-center transition-colors">
          <MoreVertical className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
};

export default BottomControls;
