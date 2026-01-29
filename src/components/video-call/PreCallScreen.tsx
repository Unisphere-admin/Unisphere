"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Settings, Phone, RotateCcw } from 'lucide-react';
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

interface PreCallScreenProps {
  sessionId: string;
  userName?: string;
  onJoinCall: (settings: {
    audioTrack: IMicrophoneAudioTrack;
    videoTrack: ICameraVideoTrack;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
  }) => void;
  onBack: () => void;
}

const PreCallScreen: React.FC<PreCallScreenProps> = ({ 
  sessionId, 
  userName, 
  onJoinCall, 
  onBack 
}) => {
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const joinedCallRef = useRef<boolean>(false);
  const tracksRef = useRef<{ audio: IMicrophoneAudioTrack | null; video: ICameraVideoTrack | null }>({
    audio: null,
    video: null,
  });

  // Initialize media devices
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Request permissions first
        try {
          await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (permissionErr) {
          console.error('Permission error:', permissionErr);
          setError('Camera and microphone access is required. Please allow access and refresh the page.');
          setIsLoading(false);
          return;
        }

        // Get available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        setCameras(videoDevices);
        setMicrophones(audioDevices);

        // Set default devices
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
        if (audioDevices.length > 0) {
          setSelectedMicrophone(audioDevices[0].deviceId);
        }

        // Create local tracks with better error handling
        try {
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            {
              microphoneId: audioDevices.length > 0 ? audioDevices[0].deviceId : undefined,
            },
            {
              cameraId: videoDevices.length > 0 ? videoDevices[0].deviceId : undefined,
            }
          );

          setLocalAudioTrack(audioTrack);
          setLocalVideoTrack(videoTrack);
          // Store in ref for cleanup
          tracksRef.current = { audio: audioTrack, video: videoTrack };

          // Play video in the preview
          if (videoRef.current && videoTrack) {
            videoTrack.play(videoRef.current);
          }

          console.log('Media tracks created successfully');
        } catch (trackErr) {
          console.error('Error creating tracks:', trackErr);
          setError('Failed to create media tracks. Please check your devices.');
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing media:', err);
        setError('Failed to access camera or microphone. Please check your permissions and try again.');
        setIsLoading(false);
      }
    };

    initializeMedia();

    // Cleanup only if user didn't join the call (e.g., navigated away)
    return () => {
      if (!joinedCallRef.current) {
        // User left without joining, clean up tracks
        if (tracksRef.current.audio) {
          try {
            tracksRef.current.audio.close();
          } catch (err) {
            console.error('Error closing audio track:', err);
          }
        }
        if (tracksRef.current.video) {
          try {
            tracksRef.current.video.close();
          } catch (err) {
            console.error('Error closing video track:', err);
          }
        }
      }
    };
  }, []);

  // Handle device changes
  const handleCameraChange = async (deviceId: string) => {
    if (!localVideoTrack) return;
    
    try {
      setSelectedCamera(deviceId);
      await localVideoTrack.setDevice(deviceId);
      console.log('Camera changed successfully');
    } catch (err) {
      console.error('Error changing camera:', err);
      // Revert selection on error
      const currentCamera = cameras.find(cam => cam.deviceId === selectedCamera);
      if (currentCamera) {
        setSelectedCamera(currentCamera.deviceId);
      }
    }
  };

  const handleMicrophoneChange = async (deviceId: string) => {
    if (!localAudioTrack) return;
    
    try {
      setSelectedMicrophone(deviceId);
      await localAudioTrack.setDevice(deviceId);
      console.log('Microphone changed successfully');
    } catch (err) {
      console.error('Error changing microphone:', err);
      // Revert selection on error
      const currentMic = microphones.find(mic => mic.deviceId === selectedMicrophone);
      if (currentMic) {
        setSelectedMicrophone(currentMic.deviceId);
      }
    }
  };

  // Toggle audio/video
  const toggleAudio = () => {
    if (!localAudioTrack) return;
    
    const newMuteState = !isAudioMuted;
    localAudioTrack.setEnabled(!newMuteState);
    setIsAudioMuted(newMuteState);
  };

  const toggleVideo = () => {
    if (!localVideoTrack) return;
    
    const newMuteState = !isVideoMuted;
    localVideoTrack.setEnabled(!newMuteState);
    setIsVideoMuted(newMuteState);
  };

  // Refresh devices
  const refreshDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      setCameras(videoDevices);
      setMicrophones(audioDevices);
    } catch (err) {
      console.error('Error refreshing devices:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#111111] to-[#1a1a1a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AEFC] mx-auto mb-4"></div>
          <p className="text-white text-lg">Setting up your camera and microphone...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#111111] to-[#1a1a1a]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Media Access Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#00AEFC] hover:bg-[#0095E0] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onBack}
              className="w-full bg-[#333] hover:bg-[#444] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#111111] to-[#1a1a1a]">
      <div className="text-center max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pre-Call Setup</h1>
          <p className="text-gray-300">
            {userName ? `Welcome, ${userName}!` : 'Welcome!'} Set up your camera and microphone before joining.
          </p>
          <div className="mt-4 bg-[#1e1e1e] rounded-lg p-3 inline-block">
            <p className="text-sm text-gray-400">Session ID: <span className="text-white font-mono">{sessionId}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Video Preview */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Video Preview</h2>
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-[#1e1e1e] rounded-lg object-cover"
                autoPlay
                muted
                playsInline
              />
              {isVideoMuted && (
                <div className="absolute inset-0 bg-[#1e1e1e] rounded-lg flex items-center justify-center">
                  <VideoOff className="w-16 h-16 text-gray-500" />
                </div>
              )}
            </div>
            
            {/* Video Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleVideo}
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
            </div>
          </div>

          {/* Audio Controls & Settings */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Audio & Settings</h2>
            
            {/* Audio Control */}
            <div className="bg-[#1e1e1e] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Microphone</span>
                <button
                  onClick={toggleAudio}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isAudioMuted 
                      ? 'bg-[#FF414D] hover:bg-[#E63946]' 
                      : 'bg-[#36B37E] hover:bg-[#2E8B57]'
                  }`}
                  title={isAudioMuted ? 'Unmute' : 'Mute'}
                >
                  {isAudioMuted ? (
                    <MicOff className="h-5 w-5 text-white" />
                  ) : (
                    <Mic className="h-5 w-5 text-white" />
                  )}
                </button>
              </div>
              
              <div className="text-sm text-gray-400">
                Status: <span className={isAudioMuted ? 'text-red-400' : 'text-green-400'}>
                  {isAudioMuted ? 'Muted' : 'Active'}
                </span>
              </div>
            </div>

            {/* Device Settings */}
            <div className="bg-[#1e1e1e] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Device Settings</span>
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="w-8 h-8 bg-[#333] hover:bg-[#444] rounded flex items-center justify-center transition-colors"
                >
                  <Settings className="h-4 w-4 text-white" />
                </button>
              </div>
              
              {isSettingsOpen && (
                <div className="space-y-4">
                  {/* Camera Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Camera</label>
                    <select
                      value={selectedCamera}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="w-full bg-[#333] text-white rounded px-3 py-2 text-sm"
                    >
                      {cameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Microphone Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Microphone</label>
                    <select
                      value={selectedMicrophone}
                      onChange={(e) => handleMicrophoneChange(e.target.value)}
                      className="w-full bg-[#333] text-white rounded px-3 py-2 text-sm"
                    >
                      {microphones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={refreshDevices}
                    className="flex items-center space-x-2 bg-[#333] hover:bg-[#444] text-white px-3 py-2 rounded text-sm transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Refresh Devices</span>
                  </button>
                </div>
              )}
            </div>

            {/* Join Call Button */}
            <div className="pt-4">
              <button
                onClick={() => {
                  if (localAudioTrack && localVideoTrack) {
                    // Mark that user is joining the call - don't cleanup tracks
                    joinedCallRef.current = true;
                    onJoinCall({
                      audioTrack: localAudioTrack,
                      videoTrack: localVideoTrack,
                      isAudioMuted,
                      isVideoMuted
                    });
                  }
                }}
                disabled={!localAudioTrack || !localVideoTrack}
                className="w-full bg-[#00AEFC] hover:bg-[#0095E0] disabled:bg-[#666] disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Phone className="h-5 w-5" />
                <span>Join Call</span>
              </button>
              
              <button
                onClick={onBack}
                className="w-full mt-3 bg-[#333] hover:bg-[#444] text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 bg-[#1e1e1e] rounded-lg border border-[#333] max-w-2xl mx-auto">
          <h3 className="text-white font-semibold mb-2 text-center">Quick Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p>• Test your microphone by speaking</p>
              <p>• Ensure good lighting for your camera</p>
            </div>
            <div>
              <p>• Check your internet connection</p>
              <p>• Close unnecessary applications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreCallScreen;
