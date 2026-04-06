// ─────────────────────────────────────────────────────────────────────────────
// PART 9: components/messaging/CallUI.jsx
// Incoming call modal + full-screen active call UI
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { formatCallDuration } from "@/app/utils/messageUtils";
import {
    MicrophoneIcon,
    PhoneIcon,
    PhoneXMarkIcon,
    UserIcon,
    VideoCameraIcon,
    VideoCameraSlashIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { memo } from "react";

// ── Incoming Call Modal ──────────────────────────────────────────────────────
export const IncomingCallModal = memo(({ incomingCall, onAnswer, onReject }) => {
  if (!incomingCall) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#242526] rounded-2xl p-6 w-80 shadow-2xl border border-white/10 text-center">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 ring-4 ring-green-500 animate-pulse overflow-hidden">
          {incomingCall.fromProfilePicture ? (
            <Image
              src={incomingCall.fromProfilePicture}
              alt=""
              width={80}
              height={80}
              className="object-cover"
            />
          ) : (
            <UserIcon className="h-10 w-10 text-white" />
          )}
        </div>
        <h3 className="text-white text-xl font-bold mb-1">{incomingCall.fromName}</h3>
        <p className="text-white/50 text-sm mb-6">
          {incomingCall.type === "video" ? "📹 Incoming video call" : "📞 Incoming audio call"}
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-8">
          <button onClick={onReject} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition active:scale-95">
              <PhoneXMarkIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-white/60 text-xs">Decline</span>
          </button>
          <button onClick={() => onAnswer(incomingCall)} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition animate-bounce active:scale-95">
              <PhoneIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-white/60 text-xs">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
});
IncomingCallModal.displayName = "IncomingCallModal";

// ── Active Call Screen ───────────────────────────────────────────────────────
export const ActiveCallScreen = memo(
  ({
    selectedChat,
    callType,
    callStatus,
    callDuration,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    onEnd,
    onToggleMute,
    onToggleVideo,
  }) => (
    <div className="fixed inset-0 z-50 bg-[#1c1e21] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden flex items-center justify-center">
            {selectedChat?.friendProfilePicture ? (
              <Image
                src={selectedChat.friendProfilePicture}
                alt=""
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <UserIcon className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <p className="text-white font-semibold">{selectedChat?.friendName}</p>
            <p className="text-white/50 text-xs">
              {callStatus === "ringing"
                ? "Ringing..."
                : callStatus === "connecting"
                ? "Connecting..."
                : callStatus === "connected"
                ? formatCallDuration(callDuration)
                : "Calling..."}
            </p>
          </div>
        </div>
      </div>

      {/* Video/Audio area */}
      <div className="flex-1 relative flex items-center justify-center bg-[#0f1011]">
        {callType === "video" ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 w-28 h-40 rounded-xl object-cover border border-white/20 shadow-xl"
            />
          </>
        ) : (
          <div className="text-center">
            <div
              className={`w-36 h-36 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 overflow-hidden ${
                callStatus === "ringing" ? "ring-4 ring-green-500 animate-pulse" : ""
              }`}
            >
              {selectedChat?.friendProfilePicture ? (
                <Image
                  src={selectedChat.friendProfilePicture}
                  alt=""
                  width={144}
                  height={144}
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-16 w-16 text-white" />
              )}
            </div>
            <h3 className="text-white text-2xl font-bold mb-2">{selectedChat?.friendName}</h3>
            <p className="text-white/50">
              {callStatus === "connected"
                ? formatCallDuration(callDuration)
                : callStatus === "ringing"
                ? "Ringing..."
                : "Connecting..."}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-6 flex items-center justify-center gap-5 border-t border-white/10">
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 ${
            isMuted ? "bg-red-500 hover:bg-red-600" : "bg-[#3a3b3c] hover:bg-[#4e4f50]"
          }`}
        >
          <MicrophoneIcon className="h-6 w-6 text-white" />
        </button>

        {callType === "video" && (
          <button
            onClick={onToggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 ${
              isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-[#3a3b3c] hover:bg-[#4e4f50]"
            }`}
          >
            {isVideoOff ? (
              <VideoCameraSlashIcon className="h-6 w-6 text-white" />
            ) : (
              <VideoCameraIcon className="h-6 w-6 text-white" />
            )}
          </button>
        )}

        <button
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg active:scale-95"
        >
          <PhoneXMarkIcon className="h-7 w-7 text-white" />
        </button>
      </div>
    </div>
  )
);
ActiveCallScreen.displayName = "ActiveCallScreen";