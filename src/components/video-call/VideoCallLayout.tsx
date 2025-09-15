"use client";

import React, { useState } from 'react';
import { useVideoCall } from './VideoCallProvider';
import TopNavbar from './TopNavbar';
import VideoGrid from './VideoGrid';
import BottomControls from './BottomControls';
import ChatPanel from './ChatPanel';
import ParticipantsPanel from './ParticipantsPanel';
import SettingsPanel from './SettingsPanel';
import NetworkStats from './NetworkStats';

export type SidePanelType = 'chat' | 'participants' | 'settings' | 'network' | null;

const VideoCallLayout: React.FC = () => {
  const { isConnected } = useVideoCall();
  const [sidePanel, setSidePanel] = useState<SidePanelType>(null);
  const [showControls, setShowControls] = useState(true);

  // Show controls on hover, hide after 3 seconds of no hover
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      setShowControls(true);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const handleMouseLeave = () => {
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    // Add event listeners to the main container
    const container = document.querySelector('.video-call-container');
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // Initial state - show controls
    setShowControls(true);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  // This component should only render when connected
  if (!isConnected) {
    return null;
  }

  return (
    <div className="video-call-container flex flex-col h-screen bg-[#111111] overflow-hidden">
      {/* Top Navbar */}
      <TopNavbar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <VideoGrid />
        </div>
        
        {/* Bottom Controls */}
        <div className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <BottomControls 
            onToggleSidePanel={(type: SidePanelType) => setSidePanel(sidePanel === type ? null : type)}
            activeSidePanel={sidePanel}
          />
        </div>
      </div>
      
      {/* Side Panels */}
      <ChatPanel 
        isOpen={sidePanel === 'chat'} 
        onClose={() => setSidePanel(null)}
        title="Chat"
        children={null}
      />
      <ParticipantsPanel 
        isOpen={sidePanel === 'participants'} 
        onClose={() => setSidePanel(null)}
        title="Participants"
        children={null}
      />
      <SettingsPanel 
        isOpen={sidePanel === 'settings'} 
        onClose={() => setSidePanel(null)}
        title="Settings"
        children={null}
      />
      
      {/* Network Stats Panel */}
      {sidePanel === 'network' && (
        <div className="fixed right-0 top-0 h-full w-80 bg-[#1a1a1a] border-l border-[#333] overflow-y-auto z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-semibold">Network Information</h2>
              <button
                onClick={() => setSidePanel(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <NetworkStats />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCallLayout;
