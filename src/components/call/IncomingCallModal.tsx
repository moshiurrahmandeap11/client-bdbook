"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { ICallPartner, CallType } from "@/types/call.types";

interface IncomingCallModalProps {
  partner: ICallPartner | null;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  partner,
  callType,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  if (!partner) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 ring-1 ring-primary/20">
        {/* Left: Avatar with pulsing ring + caller info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary bg-primary/10 flex items-center justify-center font-bold text-primary text-base">
              {partner.avatar ? (
                <img
                  src={partner.avatar}
                  alt={partner.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                partner.name.charAt(0).toUpperCase()
              )}
            </div>
            {/* Pulsing ring animation */}
            <span className="absolute -inset-1 rounded-full border-2 border-primary/60 animate-ping pointer-events-none" />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate">
              {partner.name}
            </h4>
            <p className="text-xs text-primary font-medium flex items-center gap-1.5 mt-0.5">
              {callType === "video" ? (
                <>
                  <Video className="w-3.5 h-3.5" />
                  <span>Incoming Video Call...</span>
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5" />
                  <span>Incoming Audio Call...</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Accept & Decline action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Decline Button */}
          <button
            type="button"
            onClick={onReject}
            title="Decline"
            className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          {/* Accept Button */}
          <button
            type="button"
            onClick={onAccept}
            title="Accept"
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-bounce"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

