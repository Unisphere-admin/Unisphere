import { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";

// Define a compatible user type for video calls
export interface VideoCallUser {
  id: string;
  email?: string;
  name?: string;
  role?: 'student' | 'tutor' | 'user';
  avatar_url?: string;
  profilePic?: string;
  hasProfile?: boolean;
  tokens?: number;
  bio?: string;
  has_access?: boolean;
}

export interface VideoCallState {
  client: IAgoraRTCClient | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  screenTrack: ILocalVideoTrack | null;
  isConnected: boolean;
  channelName: string;
  conversationId: string;
  messages: any[];
  isLoadingMessages: boolean;
  user: VideoCallUser | null;
  sessionId: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenSharing: () => Promise<void>;
  onEndCall: () => Promise<void>;
  onSendMessage: (content: string) => Promise<void>;
}

export interface VideoTileProps {
  user: IAgoraRTCRemoteUser;
  isLocal?: boolean;
  isScreenSharing?: boolean;
}

export interface ControlButtonProps {
  onClick: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  position?: 'left' | 'right';
}
