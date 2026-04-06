// ─────────────────────────────────────────────────────────────────────────────
// PART 6: components/messaging/MessageList.jsx
// Individual message bubbles + full message list with auto-scroll
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { formatTime } from "@/app/utils/messageUtils";
import { DocumentIcon, UserIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { memo, useEffect, useRef } from "react";
import { VoiceMessagePlayer } from "./VoiceMessage";

// ── Message Content Renderer ─────────────────────────────────────────────────
const MessageContent = memo(({ msg, userId }) => {
  const isOwn = msg.senderId === userId;

  if (msg.messageType === "image") {
    return (
      <Image
        src={msg.mediaUrl}
        alt="img"
        width={240}
        height={240}
        className="rounded-xl cursor-pointer max-w-[240px] object-cover"
        onClick={() => window.open(msg.mediaUrl, "_blank")}
      />
    );
  }

  if (msg.messageType === "video") {
    return (
      <video
        src={msg.mediaUrl}
        controls
        className="rounded-xl max-w-[240px]"
        preload="metadata"
      />
    );
  }

  if (msg.messageType === "document") {
    return (
      <a
        href={msg.mediaUrl}
        download={msg.fileName}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition max-w-[220px]"
      >
        <DocumentIcon className="h-7 w-7 text-blue-300 flex-shrink-0" />
        <span className="text-sm truncate">{msg.fileName || "Document"}</span>
      </a>
    );
  }

  if (msg.messageType === "voice") {
    return (
      <VoiceMessagePlayer
        audioUrl={msg.mediaUrl}
        duration={msg.duration}
        messageId={msg._id}
        isOwn={isOwn}
      />
    );
  }

  // Text
  const text = typeof msg.message === "string" ? msg.message : String(msg.message || "");
  return <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>;
});
MessageContent.displayName = "MessageContent";

// ── Single Message Bubble ────────────────────────────────────────────────────
const MessageItem = memo(({ msg, userId, chat, isSameAsPrev, isSameAsNext }) => {
  const isOwn = msg.senderId === userId;
  const showAvatar = !isOwn && !isSameAsNext;
  const topRadius = isSameAsPrev ? (isOwn ? "rounded-tr-md" : "rounded-tl-md") : "";
  const bottomRadius = isSameAsNext ? (isOwn ? "rounded-br-md" : "rounded-bl-md") : "";
  const marginTop = isSameAsPrev ? "mt-0.5" : "mt-3";

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2 ${marginTop}`}
    >
      {/* Left avatar placeholder */}
      {!isOwn && (
        <div className="w-7 h-7 flex-shrink-0">
          {showAvatar && (
            <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {chat.friendProfilePicture ? (
                <Image
                  src={chat.friendProfilePicture}
                  alt=""
                  width={28}
                  height={28}
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-4 w-4 text-white" />
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col max-w-[65%]">
        <div
          className={`
            relative group
            ${msg.messageType === "text" ? "px-3 py-2" : "p-1"}
            rounded-2xl ${topRadius} ${bottomRadius}
            ${isOwn ? "bg-[#0084ff] text-white" : "bg-[#3a3b3c] text-white"}
            transition-all duration-150
          `}
        >
          <MessageContent msg={msg} userId={userId} />
          {/* Timestamp on hover */}
          <span className="absolute -bottom-5 right-0 text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
            {formatTime(msg.createdAt)}
            {isOwn && msg.isRead && " · Seen"}
          </span>
        </div>
      </div>
    </div>
  );
});
MessageItem.displayName = "MessageItem";

// ── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = memo(({ chat }) => (
  <div className="flex justify-start items-end gap-2 mt-3">
    <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
      {chat.friendProfilePicture ? (
        <Image src={chat.friendProfilePicture} alt="" width={28} height={28} className="object-cover" />
      ) : (
        <UserIcon className="h-4 w-4 text-white" />
      )}
    </div>
    <div className="bg-[#3a3b3c] px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 bg-white/60 rounded-full"
          style={{ animation: `bounce 1s ${delay}ms infinite` }}
        />
      ))}
    </div>
  </div>
));
TypingIndicator.displayName = "TypingIndicator";

// ── MessageList ──────────────────────────────────────────────────────────────
export const MessageList = memo(({ messages, userId, chat, typingUser }) => {
  const endRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUser]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0 overscroll-contain">
      {messages.map((msg, idx) => {
        const prev = messages[idx - 1];
        const next = messages[idx + 1];
        return (
          <MessageItem
            key={msg._id || idx}
            msg={msg}
            userId={userId}
            chat={chat}
            isSameAsPrev={prev?.senderId === msg.senderId}
            isSameAsNext={next?.senderId === msg.senderId}
          />
        );
      })}

      {typingUser && <TypingIndicator chat={chat} />}

      <div ref={endRef} className="h-6" />
    </div>
  );
});
MessageList.displayName = "MessageList";