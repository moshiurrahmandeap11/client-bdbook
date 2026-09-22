export type CallState = "idle" | "calling" | "incoming" | "connected";

export type CallType = "audio" | "video";

export interface ICallPartner {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface ICallContext {
  callState: CallState;
  callType: CallType;
  partner: ICallPartner | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  startCall: (params: {
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string | null;
    type: CallType;
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

