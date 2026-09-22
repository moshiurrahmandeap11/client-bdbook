"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthProvider";
import { useSocket } from "./SocketProvider";
import { CallState, CallType, ICallContext, ICallPartner } from "@/types/call.types";
import { toneGenerator } from "@/lib/audio-tones";
import IncomingCallModal from "../call/IncomingCallModal";
import ActiveCallModal from "../call/ActiveCallModal";
import PermissionGuideModal from "../call/PermissionGuideModal";
import { sendMessage } from "@/services/message.service";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

const CallContext = createContext<ICallContext | null>(null);

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();

  const currentUserId = user?.id || (user as any)?._id;
  const currentUserName = user?.fullName || (user as any)?.name || "User";
  const currentUserAvatar =
    (user as any)?.profilePicUrl ||
    (typeof (user as any)?.profilePicture === "object"
      ? (user as any)?.profilePicture?.url
      : (user as any)?.profilePicture) ||
    (user as any)?.avatar ||
    null;

  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [partner, setPartner] = useState<ICallPartner | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionType, setPermissionType] = useState<CallType>("audio");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const bufferedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callDurationRef = useRef<number>(0);
  const partnerRef = useRef<ICallPartner | null>(null);
  const callTypeRef = useRef<CallType>("audio");
  const callStateRef = useRef<CallState>("idle");
  const lastCallParamsRef = useRef<{
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string | null;
    type: CallType;
  } | null>(null);

  // Keep refs synced with states for access in async socket callbacks
  useEffect(() => {
    partnerRef.current = partner;
  }, [partner]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Clean teardown helper
  const cleanUpCall = useCallback(() => {
    toneGenerator.stopTones();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    setLocalStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((t) => t.stop());
      }
      return null;
    });

    setRemoteStream(null);
    incomingOfferRef.current = null;
    bufferedCandidatesRef.current = [];
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    setCallState("idle");
    setPartner(null);
  }, []);

  // Timer runner for connected calls
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
  }, [callState]);

  // Handle Initiating Call (Outgoing)
  const startCall = useCallback(
    async ({
      partnerId,
      partnerName,
      partnerAvatar,
      type,
    }: {
      partnerId: string;
      partnerName: string;
      partnerAvatar?: string | null;
      type: CallType;
    }) => {
      if (!socket) {
        toast.error("Connecting to server. Please try again in a moment.");
        return;
      }
      if (callState !== "idle") {
        toast.error("You are already on another call");
        return;
      }
      if (!isUserOnline(partnerId)) {
        toast.error(`${partnerName} is currently offline`);
        return;
      }

      lastCallParamsRef.current = {
        partnerId,
        partnerName,
        partnerAvatar,
        type,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video" ? { width: 1280, height: 720 } : false,
        });

        setLocalStream(stream);
        setIsVideoOff(type !== "video");

        const targetPartner: ICallPartner = {
          id: partnerId,
          name: partnerName,
          avatar: partnerAvatar,
        };
        setPartner(targetPartner);
        setCallType(type);
        setCallState("calling");

        toneGenerator.playDialTone();

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local stream tracks to WebRTC peer
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // When remote stream tracks arrive
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          }
        };

        // When local ICE candidate is gathered, send to remote peer
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice_candidate", {
              to: partnerId,
              candidate: event.candidate,
            });
          }
        };

        // Create SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call_user", {
          to: partnerId,
          from: currentUserId,
          fromName: currentUserName,
          fromAvatar: currentUserAvatar,
          type,
          offer,
        });
      } catch (err: any) {
        cleanUpCall();
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError" ||
          err.name === "NotFoundError"
        ) {
          setPermissionType(type);
          setShowPermissionModal(true);
        } else {
          toast.error("Could not access camera/microphone.");
        }
      }
    },
    [
      socket,
      callState,
      isUserOnline,
      currentUserId,
      currentUserName,
      currentUserAvatar,
      cleanUpCall,
    ]
  );

  // Handle Accepting Incoming Call
  const acceptCall = useCallback(async () => {
    if (!socket || !partnerRef.current || !incomingOfferRef.current) return;
    toneGenerator.stopTones();

    try {
      const type = callTypeRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video" ? { width: 1280, height: 720 } : false,
      });

      setLocalStream(stream);
      setIsVideoOff(type !== "video");

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks to peer
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && partnerRef.current) {
          socket.emit("ice_candidate", {
            to: partnerRef.current.id,
            candidate: event.candidate,
          });
        }
      };

      // Set remote offer description
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingOfferRef.current)
      );

      // Drain any buffered ICE candidates received before remote description was ready
      if (bufferedCandidatesRef.current.length > 0) {
        for (const cand of bufferedCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }
        bufferedCandidatesRef.current = [];
      }

      // Create and send SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer_call", {
        to: partnerRef.current.id,
        answer,
      });

      setCallState("connected");
    } catch (err: any) {
      cleanUpCall();
      if (partnerRef.current) {
        socket.emit("reject_call", { to: partnerRef.current.id });
      }
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.name === "NotFoundError"
      ) {
        setPermissionType(callTypeRef.current);
        setShowPermissionModal(true);
      } else {
        toast.error("Failed to connect call");
      }
    }
  }, [socket, cleanUpCall]);

  // Handle Rejecting Incoming Call
  const rejectCall = useCallback(() => {
    if (socket && partnerRef.current) {
      socket.emit("reject_call", { to: partnerRef.current.id });
    }
    toneGenerator.playEndTone();
    cleanUpCall();
  }, [socket, cleanUpCall]);

  // Handle Ending Call (Manual Hangup)
  const endCall = useCallback(() => {
    const activePartner = partnerRef.current;
    const duration = callDurationRef.current;
    const type = callTypeRef.current;
    const wasConnected = callStateRef.current === "connected";

    if (socket && activePartner) {
      socket.emit("end_call", { to: activePartner.id });
    }

    toneGenerator.playEndTone();

    // Log call outcome in message chat stream
    if (activePartner && wasConnected && duration > 0) {
      const min = Math.floor(duration / 60);
      const sec = duration % 60;
      const durationFormatted = min > 0 ? `${min}m ${sec}s` : `${sec}s`;
      sendMessage({
        receiverId: activePartner.id,
        message: `📞 ${type === "video" ? "Video" : "Audio"} call ended • ${durationFormatted}`,
        messageType: "text",
      }).catch(() => {});
    }

    cleanUpCall();
  }, [socket, cleanUpCall]);

  // Toggle Mute Local Mic
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle Local Video Camera
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Retry permission request
  const handleRetryPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: permissionType === "video",
      });
      stream.getTracks().forEach((t) => t.stop());
      setShowPermissionModal(false);
      toast.success("Permission granted!");
      if (lastCallParamsRef.current) {
        startCall(lastCallParamsRef.current);
      }
    } catch {
      toast.error("Permission still blocked. Please allow in browser address bar.");
    }
  }, [permissionType, startCall]);

  // Socket Event Listeners for Call Signaling
  useEffect(() => {
    if (!socket) return;

    // Incoming call arrived
    const handleIncomingCall = (data: {
      from: string;
      fromName: string;
      fromAvatar?: string | null;
      type: CallType;
      offer: RTCSessionDescriptionInit;
    }) => {
      // If user is already in a call, notify caller that we're busy
      if (callStateRef.current !== "idle") {
        socket.emit("call_busy", { to: data.from });
        return;
      }

      incomingOfferRef.current = data.offer;
      bufferedCandidatesRef.current = [];
      setPartner({
        id: data.from,
        name: data.fromName,
        avatar: data.fromAvatar,
      });
      setCallType(data.type || "audio");
      setCallState("incoming");

      toneGenerator.playRingtone();
    };

    // Caller receives acceptance from callee
    const handleCallAccepted = async (data: { answer: RTCSessionDescriptionInit }) => {
      toneGenerator.stopTones();
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

        // Drain buffered candidates
        if (bufferedCandidatesRef.current.length > 0) {
          for (const cand of bufferedCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
          bufferedCandidatesRef.current = [];
        }

        setCallState("connected");
      } catch (err) {
        cleanUpCall();
        toast.error("Failed to establish video connection");
      }
    };

    // Callee rejected call
    const handleCallRejected = () => {
      toneGenerator.stopTones();
      toneGenerator.playEndTone();
      toast("Call declined");
      cleanUpCall();
    };

    // Callee is on another call
    const handleCallBusy = () => {
      toneGenerator.stopTones();
      toneGenerator.playEndTone();
      toast.error("User is currently on another call");
      cleanUpCall();
    };

    // Peer ended the call
    const handleCallEnded = () => {
      toneGenerator.stopTones();
      toneGenerator.playEndTone();
      toast("Call ended");
      cleanUpCall();
    };

    // Remote ICE Candidate arrived
    const handleIceCandidate = async (data: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
        bufferedCandidatesRef.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("Error adding remote ICE candidate:", err);
      }
    };

    const handleCallError = (data: { message: string }) => {
      toneGenerator.stopTones();
      toneGenerator.playEndTone();
      toast.error(data.message || "Call failed");
      cleanUpCall();
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_busy", handleCallBusy);
    socket.on("call_ended", handleCallEnded);
    socket.on("ice_candidate", handleIceCandidate);
    socket.on("call_error", handleCallError);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_busy", handleCallBusy);
      socket.off("call_ended", handleCallEnded);
      socket.off("ice_candidate", handleIceCandidate);
      socket.off("call_error", handleCallError);
    };
  }, [socket, cleanUpCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        partner,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        callDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
      }}
    >
      {children}

      {/* Global Incoming Call Banner / Modal */}
      {callState === "incoming" && (
        <IncomingCallModal
          partner={partner}
          callType={callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Global Active Call Fullscreen / Overlay Modal */}
      {(callState === "calling" || callState === "connected") && (
        <ActiveCallModal
          callState={callState}
          callType={callType}
          partner={partner}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          callDuration={callDuration}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}

      {/* Permission Guide Modal */}
      <PermissionGuideModal
        isOpen={showPermissionModal}
        callType={permissionType}
        onClose={() => setShowPermissionModal(false)}
        onRetry={handleRetryPermission}
      />
    </CallContext.Provider>
  );
}

