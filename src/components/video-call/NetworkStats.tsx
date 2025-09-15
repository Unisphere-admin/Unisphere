"use client";

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Signal, Activity } from 'lucide-react';
import { useVideoCall } from './VideoCallProvider';

interface NetworkStats {
  rtt: number;
  uplinkNetworkQuality: number;
  downlinkNetworkQuality: number;
  uplinkBitrate: number;
  downlinkBitrate: number;
  uplinkPacketLossRate: number;
  downlinkPacketLossRate: number;
  localAudioStats: {
    sendBitrate: number;
    sendPacketLossRate: number;
    codecType: string;
  } | null;
  localVideoStats: {
    sendBitrate: number;
    sendPacketLossRate: number;
    codecType: string;
    frameRate: number;
    resolution: string;
  } | null;
  remoteAudioStats: {
    receiveBitrate: number;
    receivePacketLossRate: number;
    codecType: string;
  }[];
  remoteVideoStats: {
    receiveBitrate: number;
    receivePacketLossRate: number;
    codecType: string;
    frameRate: number;
    resolution: string;
  }[];
}

const NetworkStats: React.FC = () => {
  const { client, isConnected } = useVideoCall();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!client || !isConnected) return;

    const updateStats = async () => {
      try {
        // Get transport stats
        let transportStats = null;
        try {
          if (typeof (client as any).getTransportStats === 'function') {
            transportStats = await (client as any).getTransportStats();
          }
        } catch (err) {
          console.debug('Transport stats not available:', err);
        }

        // Get connection stats
        let connectionStats = null;
        try {
          if (typeof (client as any).getConnectionStats === 'function') {
            connectionStats = await (client as any).getConnectionStats();
          }
        } catch (err) {
          console.debug('Connection stats not available:', err);
        }

        // Get local audio stats
        let localAudioStats = null;
        try {
          if (typeof (client as any).getLocalAudioStats === 'function') {
            localAudioStats = await (client as any).getLocalAudioStats();
          }
        } catch (err) {
          console.debug('Local audio stats not available:', err);
        }

        // Get local video stats
        let localVideoStats = null;
        try {
          if (typeof (client as any).getLocalVideoStats === 'function') {
            localVideoStats = await (client as any).getLocalVideoStats();
          }
        } catch (err) {
          console.debug('Local video stats not available:', err);
        }

        // Get remote audio stats
        let remoteAudioStats = null;
        try {
          if (typeof (client as any).getRemoteAudioStats === 'function') {
            remoteAudioStats = await (client as any).getRemoteAudioStats();
          }
        } catch (err) {
          console.debug('Remote audio stats not available:', err);
        }

        // Get remote video stats
        let remoteVideoStats = null;
        try {
          if (typeof (client as any).getRemoteVideoStats === 'function') {
            remoteVideoStats = await (client as any).getRemoteVideoStats();
          }
        } catch (err) {
          console.debug('Remote video stats not available:', err);
        }

        setStats({
          rtt: transportStats?.RTT || connectionStats?.RTT || 0,
          uplinkNetworkQuality: transportStats?.UplinkNetworkQuality || connectionStats?.UplinkNetworkQuality || 0,
          downlinkNetworkQuality: transportStats?.DownlinkNetworkQuality || connectionStats?.DownlinkNetworkQuality || 0,
          uplinkBitrate: transportStats?.UplinkBitrate || connectionStats?.UplinkBitrate || 0,
          downlinkBitrate: transportStats?.DownlinkBitrate || connectionStats?.DownlinkBitrate || 0,
          uplinkPacketLossRate: transportStats?.UplinkPacketLossRate || connectionStats?.UplinkPacketLossRate || 0,
          downlinkPacketLossRate: transportStats?.DownlinkPacketLossRate || connectionStats?.DownlinkPacketLossRate || 0,
          localAudioStats: localAudioStats ? {
            sendBitrate: localAudioStats.sendBitrate || 0,
            sendPacketLossRate: localAudioStats.sendPacketLossRate || 0,
            codecType: localAudioStats.codecType || 'Unknown'
          } : null,
          localVideoStats: localVideoStats ? {
            sendBitrate: localVideoStats.sendBitrate || 0,
            sendPacketLossRate: localVideoStats.sendPacketLossRate || 0,
            codecType: localVideoStats.codecType || 'Unknown',
            frameRate: localVideoStats.frameRate || 0,
            resolution: localVideoStats.resolution || 'Unknown'
          } : null,
          remoteAudioStats: remoteAudioStats ? Object.values(remoteAudioStats).map((stats: any) => ({
            receiveBitrate: stats.receiveBitrate || 0,
            receivePacketLossRate: stats.receivePacketLossRate || 0,
            codecType: stats.codecType || 'Unknown'
          })) : [],
          remoteVideoStats: remoteVideoStats ? Object.values(remoteVideoStats).map((stats: any) => ({
            receiveBitrate: stats.receiveBitrate || 0,
            receivePacketLossRate: stats.receivePacketLossRate || 0,
            codecType: stats.codecType || 'Unknown',
            frameRate: stats.frameRate || 0,
            resolution: stats.resolution || 'Unknown'
          })) : []
        });
      } catch (error) {
        // Only log errors in development to reduce console noise
        if (process.env.NODE_ENV === 'development') {
          console.debug('Error getting network stats:', error);
        }
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [client, isConnected]);

  if (!isConnected || !stats) {
    return null;
  }

  const getQualityColor = (quality: number) => {
    if (quality >= 4) return 'text-green-400';
    if (quality >= 2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityText = (quality: number) => {
    if (quality >= 4) return 'Excellent';
    if (quality >= 2) return 'Good';
    return 'Poor';
  };

  const formatBitrate = (bitrate: number) => {
    if (bitrate < 1000) return `${bitrate.toFixed(1)} bps`;
    if (bitrate < 1000000) return `${(bitrate / 1000).toFixed(1)} kbps`;
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  };

  const formatPacketLoss = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  return (
    <div className="bg-[#1e1e1e] rounded-lg border border-[#333] overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-[#2a2a2a] cursor-pointer hover:bg-[#333] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-[#00AEFC]" />
          <span className="text-white font-medium">Network Statistics</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Connection Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#252525] p-3 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <Signal className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm">Uplink</span>
              </div>
              <div className={`text-lg font-semibold ${getQualityColor(stats.uplinkNetworkQuality)}`}>
                {getQualityText(stats.uplinkNetworkQuality)}
              </div>
              <div className="text-xs text-gray-400">
                Quality: {stats.uplinkNetworkQuality}/5
              </div>
            </div>
            
            <div className="bg-[#252525] p-3 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <Signal className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm">Downlink</span>
              </div>
              <div className={`text-lg font-semibold ${getQualityColor(stats.downlinkNetworkQuality)}`}>
                {getQualityText(stats.downlinkNetworkQuality)}
              </div>
              <div className="text-xs text-gray-400">
                Quality: {stats.downlinkNetworkQuality}/5
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="bg-[#252525] p-3 rounded">
            <h4 className="text-white font-medium mb-2">Connection Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">RTT:</span>
                <span className="text-white">{stats.rtt}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Uplink:</span>
                <span className="text-white">{formatBitrate(stats.uplinkBitrate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Downlink:</span>
                <span className="text-white">{formatBitrate(stats.downlinkBitrate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Uplink Loss:</span>
                <span className="text-white">{formatPacketLoss(stats.uplinkPacketLossRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Downlink Loss:</span>
                <span className="text-white">{formatPacketLoss(stats.downlinkPacketLossRate)}</span>
              </div>
            </div>
          </div>

          {/* Local Media Stats */}
          {stats.localAudioStats && (
            <div className="bg-[#252525] p-3 rounded">
              <h4 className="text-white font-medium mb-2">Local Audio</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bitrate:</span>
                  <span className="text-white">{formatBitrate(stats.localAudioStats.sendBitrate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Packet Loss:</span>
                  <span className="text-white">{formatPacketLoss(stats.localAudioStats.sendPacketLossRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Codec:</span>
                  <span className="text-white">{stats.localAudioStats.codecType}</span>
                </div>
              </div>
            </div>
          )}

          {stats.localVideoStats && (
            <div className="bg-[#252525] p-3 rounded">
              <h4 className="text-white font-medium mb-2">Local Video</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bitrate:</span>
                  <span className="text-white">{formatBitrate(stats.localVideoStats.sendBitrate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Frame Rate:</span>
                  <span className="text-white">{stats.localVideoStats.frameRate} fps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Resolution:</span>
                  <span className="text-white">{stats.localVideoStats.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Codec:</span>
                  <span className="text-white">{stats.localVideoStats.codecType}</span>
                </div>
              </div>
            </div>
          )}

          {/* Remote Users Stats */}
          {stats.remoteAudioStats.length > 0 && (
            <div className="bg-[#252525] p-3 rounded">
              <h4 className="text-white font-medium mb-2">Remote Users ({stats.remoteAudioStats.length})</h4>
              <div className="space-y-2">
                {stats.remoteAudioStats.map((audioStats, index) => (
                  <div key={index} className="text-sm border-l-2 border-[#00AEFC] pl-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">User {index + 1} Audio:</span>
                        <span className="text-white">{formatBitrate(audioStats.receiveBitrate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Packet Loss:</span>
                        <span className="text-white">{formatPacketLoss(audioStats.receivePacketLossRate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info about available stats */}
          {!stats.localAudioStats && !stats.localVideoStats && (
            <div className="bg-[#252525] p-3 rounded">
              <p className="text-sm text-gray-400 text-center">
                Network statistics may be limited based on your Agora SDK version.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkStats;
