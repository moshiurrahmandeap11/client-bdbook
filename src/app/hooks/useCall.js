// ─────────────────────────────────────────────────────────────────────────────
// PART 5: hooks/useCall.js
// WebRTC call management — audio + video calls, fully self-contained hook
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { createRingtone, RTC_CONFIGURATION } from "@/app/utils/messageUtils";
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

export const useCall = ({ socket, user, selectedChatRef }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [callType, setCallType] = useState(null);         // "audio" | "video"
  const [callStatus, setCallStatus] = useState(null);     // "ringing" | "connecting" | "connected"
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);

  // ── Ringtone ───────────────────────────────────────────────────────────────
  const playRingtone = useCallback(() => {
    ringtoneRef.current = createRingtone();
  }, []);

  const stopRingtone = useCallback(() => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startCallTimer = useCallback(() => {
    if (!callTimerRef.current) {
      callTimerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
    }
  }, []);

  // ── Media ──────────────────────────────────────────────────────────────────
  const initMediaStream = useCallback(async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      setLocalStream(stream);
      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch {
      toast.error("Camera/Microphone access denied. Please allow permissions.");
      return null;
    }
  }, []);

  // ── PeerConnection ─────────────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    (stream) => {
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          const targetId = selectedChatRef.current?.friendId;
          if (targetId) socket.emit("ice_candidate", { to: targetId, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
          setIsCallConnected(true);
          stopRingtone();
          startCallTimer();
        } else if (["disconnected", "failed"].includes(pc.connectionState)) {
          endCall();
        }
      };

      return pc;
    },
    [socket, selectedChatRef, stopRingtone, startCallTimer] // eslint-disable-line
  );

  // ── End Call ───────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    stopRingtone();
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    localStream?.getTracks().forEach((t) => t.stop());
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (socket && selectedChatRef.current) {
      socket.emit("end_call", { to: selectedChatRef.current.friendId });
    }
    setIsCalling(false);
    setIsInCall(false);
    setIsCallConnected(false);
    setCallType(null);
    setCallStatus(null);
    setLocalStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    setIncomingCall(null);
  }, [localStream, socket, selectedChatRef, stopRingtone]);

  // ── Start Call ─────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (type, onlineUsers) => {
      if (!selectedChatRef.current) return;
      if (isCalling || isInCall || isCallConnected) { toast.error("Already in a call"); return; }
      if (!onlineUsers.includes(selectedChatRef.current.friendId)) {
        toast.error(`${selectedChatRef.current.friendName} is offline`);
        return;
      }

      setCallType(type);
      setIsCalling(true);
      setCallStatus("ringing");
      setCallDuration(0);
      setIsCallConnected(false);
      playRingtone();

      const stream = await initMediaStream(type);
      if (!stream) { setIsCalling(false); setCallStatus(null); stopRingtone(); return; }

      const pc = createPeerConnection(stream);
      peerConnectionRef.current = pc;

      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
        await pc.setLocalDescription(offer);
        socket.emit("call_user", {
          to: selectedChatRef.current.friendId,
          from: user._id,
          fromName: user.fullName,
          fromProfilePicture: user.profilePicture?.url || null,
          type,
          offer,
        });
      } catch {
        toast.error("Failed to start call");
        endCall();
      }
    },
    [isCalling, isInCall, isCallConnected, selectedChatRef, playRingtone, stopRingtone, initMediaStream, createPeerConnection, socket, user, endCall]
  );

  // ── Answer Call ────────────────────────────────────────────────────────────
  const answerCall = useCallback(
    async (callData) => {
      if (!callData) return;
      if (isCalling || isInCall || isCallConnected) {
        socket.emit("call_busy", { to: callData.from });
        return;
      }
      stopRingtone();
      setCallType(callData.type);
      setIsInCall(true);
      setCallStatus("connecting");
      setIncomingCall(null);
      setCallDuration(0);
      setIsCallConnected(false);

      const stream = await initMediaStream(callData.type);
      if (!stream) { toast.error("Failed to access media devices"); return; }

      const pc = createPeerConnection(stream);
      peerConnectionRef.current = pc;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer_call", { to: callData.from, answer });
        setCallStatus("connected");
        setIsCallConnected(true);
        startCallTimer();
      } catch {
        toast.error("Failed to answer call");
        endCall();
      }
    },
    [isCalling, isInCall, isCallConnected, stopRingtone, initMediaStream, createPeerConnection, socket, startCallTimer, endCall]
  );

  // ── Socket Event Handlers (called from parent) ─────────────────────────────
  const handleCallAccepted = useCallback(
    async (data) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setIsCalling(false);
          setIsInCall(true);
          setCallStatus("connected");
          setIsCallConnected(true);
          stopRingtone();
          startCallTimer();
        } catch { endCall(); }
      }
    },
    [stopRingtone, startCallTimer, endCall]
  );

  const handleIceCandidate = useCallback(async (data) => {
    if (peerConnectionRef.current && data.candidate) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    }
  }, []);

  const handleIncomingCall = useCallback(
    (data) => {
      if (isInCall || isCalling || isCallConnected) {
        socket.emit("call_busy", { to: data.from });
        return;
      }
      setIncomingCall(data);
      playRingtone();
    },
    [isInCall, isCalling, isCallConnected, socket, playRingtone]
  );

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream && callType === "video") {
      const track = localStream.getVideoTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
    }
  }, [localStream, callType]);

  const rejectIncomingCall = useCallback(() => {
    stopRingtone();
    if (incomingCall) socket?.emit("reject_call", { to: incomingCall.from });
    setIncomingCall(null);
  }, [stopRingtone, incomingCall, socket]);

  return {
    // state
    isCalling, isInCall, isCallConnected,
    callType, callStatus, callDuration,
    localStream, isMuted, isVideoOff,
    incomingCall,
    // refs
    localVideoRef, remoteVideoRef,
    // actions
    startCall, answerCall, endCall,
    toggleMute, toggleVideo,
    rejectIncomingCall,
    // socket handlers
    handleCallAccepted, handleIceCandidate, handleIncomingCall,
  };
};