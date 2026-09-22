"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { CallState, CallType, ICallPartner } from "@/types/call.types";

interface ActiveCallModalProps {
  callState: CallState;
  callType: CallType;
  partner: ICallPartner | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ActiveCallModal({
  callState,
  callType,
  partner,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  callDuration,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: ActiveCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Bind local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Bind remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (callState !== "calling" && callState !== "connected") return null;

  const isVideoCall = callType === "video";
  const hasRemoteVideo =
    isVideoCall &&
    remoteStream &&
    remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-300"
    >
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center font-bold text-white text-sm">
            {partner?.avatar ? (
              <img
                src={partner.avatar}
                alt={partner?.name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              (partner?.name || "U").charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm sm:text-base">
              {partner?.name || "User"}
            </h3>
            <p className="text-slate-400 text-xs">
              {callState === "calling"
                ? "Calling..."
                : formatDuration(callDuration)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Call View Area */}
      <div className="relative w-full max-w-4xl flex-1 my-4 flex items-center justify-center overflow-hidden rounded-3xl bg-slate-900/60 border border-white/10">
        {/* Remote Video Stream or Avatar Card */}
        {isVideoCall && callState === "connected" ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${
                hasRemoteVideo ? "block" : "hidden"
              }`}
            />
            {/* Fallback if partner video track is muted/hidden */}
            {!hasRemoteVideo && (
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-white/20 bg-white/10 flex items-center justify-center font-bold text-white text-3xl sm:text-4xl shadow-2xl">
                  {partner?.avatar ? (
                    <img
                      src={partner.avatar}
                      alt={partner.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (partner?.name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <p className="text-slate-400 text-xs sm:text-sm">
                  {partner?.name}&apos;s camera is off
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Audio Call View or Outgoing Dialing State */
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            <div className="relative">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-white/20 bg-white/10 flex items-center justify-center font-bold text-white text-3xl sm:text-4xl shadow-2xl">
                {partner?.avatar ? (
                  <img
                    src={partner.avatar}
                    alt={partner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (partner?.name || "U").charAt(0).toUpperCase()
                )}
              </div>
              {/* Pulse rings */}
              <div className="absolute -inset-2 rounded-full border-2 border-primary/50 animate-ping pointer-events-none" />
              <div className="absolute -inset-4 rounded-full border border-primary/30 animate-pulse pointer-events-none" />
            </div>

            <div>
              <h2 className="text-white text-xl sm:text-2xl font-bold">
                {partner?.name || "User"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {callState === "calling"
                  ? "Ringing..."
                  : `Audio Call (${formatDuration(callDuration)})`}
              </p>
            </div>
          </div>
        )}

        {/* Small Picture-in-Picture Local Camera in corner for Video Call */}
        {isVideoCall && (
          <div className="absolute bottom-4 right-4 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${
                isVideoOff ? "hidden" : "block"
              }`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-[10px] p-2 text-center">
                <VideoOff className="w-5 h-5 mb-1 opacity-60" />
                <span>Your camera off</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Controls Bar */}
      <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/15 px-6 py-3 rounded-full shadow-2xl z-20">
        {/* Mic Toggle Button */}
        <button
          type="button"
          onClick={onToggleMute}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isMuted
              ? "bg-rose-500 text-white"
              : "bg-white/15 hover:bg-white/25 text-white"
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera Toggle Button */}
        <button
          type="button"
          onClick={onToggleVideo}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isVideoOff
              ? "bg-rose-500 text-white"
              : "bg-white/15 hover:bg-white/25 text-white"
          }`}
        >
          {isVideoOff ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <VideoIcon className="w-5 h-5" />
          )}
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={onEndCall}
          title="End Call"
          className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ml-2"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

