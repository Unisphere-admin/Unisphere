"use client";

import React, { useState } from 'react';
import { useVideoCall } from './VideoCallProvider';
import { SidePanelProps } from './types';
import { X, Settings as SettingsIcon, Mic, Video, Monitor, Volume2, Wifi } from 'lucide-react';

const SettingsPanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title }) => {
  const { user } = useVideoCall();
  const [activeTab, setActiveTab] = useState<'devices' | 'audio' | 'video' | 'network'>('devices');

  if (!isOpen) return null;

  const tabs = [
    { id: 'devices', label: 'Devices', icon: SettingsIcon },
    { id: 'audio', label: 'Audio', icon: Mic },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'network', label: 'Network', icon: Wifi }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'devices':
        return (
          <div className="space-y-4">
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Microphone</h4>
              <select className="w-full bg-[#333333] border border-[#444444] rounded-lg px-3 py-2 text-white">
                <option>Default Microphone</option>
                <option>Microphone 1</option>
                <option>Microphone 2</option>
              </select>
            </div>
            
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Camera</h4>
              <select className="w-full bg-[#333333] border border-[#444444] rounded-lg px-3 py-2 text-white">
                <option>Default Camera</option>
                <option>Camera 1</option>
                <option>Camera 2</option>
              </select>
            </div>
            
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Speaker</h4>
              <select className="w-full bg-[#333333] border border-[#444444] rounded-lg px-3 py-2 text-white">
                <option>Default Speaker</option>
                <option>Speaker 1</option>
                <option>Speaker 2</option>
              </select>
            </div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="space-y-4">
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Microphone Level</h4>
              <div className="flex items-center space-x-3">
                <Mic className="h-5 w-5 text-[#808080]" />
                <div className="flex-1 bg-[#333333] rounded-full h-2">
                  <div className="bg-[#00AEFC] h-2 rounded-full w-3/4"></div>
                </div>
                <span className="text-white text-sm">75%</span>
              </div>
            </div>
            
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Speaker Level</h4>
              <div className="flex items-center space-x-3">
                <Volume2 className="h-5 w-5 text-[#808080]" />
                <div className="flex-1 bg-[#333333] rounded-full h-2">
                  <div className="bg-[#00AEFC] h-2 rounded-full w-1/2"></div>
                </div>
                <span className="text-white text-sm">50%</span>
              </div>
            </div>
            
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Echo Cancellation</h4>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4 text-[#00AEFC] bg-[#333333] border-[#444444] rounded" defaultChecked />
                <span className="text-white text-sm">Enable echo cancellation</span>
              </label>
            </div>
          </div>
        );
        
      case 'video':
        return (
          <div className="space-y-4">
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Video Quality</h4>
              <select className="w-full bg-[#333333] border border-[#444444] rounded-lg px-3 py-2 text-white">
                <option>720p (Recommended)</option>
                <option>480p</option>
                <option>360p</option>
                <option>1080p</option>
              </select>
            </div>
            
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Frame Rate</h4>
              <select className="w-full bg-[#333333] border border-[#444444] rounded-lg px-3 py-2 text-white">
                <option>30 fps</option>
                <option>24 fps</option>
                <option>15 fps</option>
              </select>
            </div>
            
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Virtual Background</h4>
              <button className="w-full bg-[#00AEFC] hover:bg-[#0095E0] text-white py-2 px-4 rounded-lg transition-colors">
                Choose Background
              </button>
            </div>
          </div>
        );
        
      case 'network':
        return (
          <div className="space-y-4">
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Connection Quality</h4>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#36B37E] rounded-full"></div>
                <span className="text-white text-sm">Excellent</span>
              </div>
            </div>
            
            <div className="bg-[#222222] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Network Statistics</h4>
              <div className="space-y-2 text-sm text-[#808080]">
                <div className="flex justify-between">
                  <span>Upload:</span>
                  <span>2.5 Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span>Download:</span>
                  <span>15.2 Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span>45ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Packet Loss:</span>
                  <span>0.1%</span>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#1D1D1D] border-l border-[#333333] flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#333333]">
        <h3 className="text-white font-semibold">Settings</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-[#222222] hover:bg-[#333333] rounded-full flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-[#333333]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#00AEFC] text-white'
                : 'bg-transparent text-[#808080] hover:text-white hover:bg-[#222222]'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SettingsPanel;
