// ─────────────────────────────────────────────────────────────────────────────
// PART 10: app/messages/page.jsx  (Main Orchestrator)
// Thin page component — wires everything together.
// All heavy logic lives in hooks/components (parts 1–9).
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import {
  ArrowLeftIcon,
  PhoneIcon,
  UserIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { PhoneIcon as PhoneSolidIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

// ── Parts ────────────────────────────────────────────────────────────────────




import { useCall } from "@/app/hooks/useCall";
import {
  useConversations,
  useMessages,
  useMessagingActions,
} from "@/app/hooks/useMessaging";
import { playMessageReceiveSound } from "@/app/utils/messageUtils";
import { ActiveCallScreen, IncomingCallModal } from "./CallUI";
import { ChatInput } from "./ChatInput";
import { ConversationList } from "./ConversationList";
import { MessageList } from "./MessageList";
import { MessageListSkeleton } from "./Skeletons";

// ─────────────────────────────────────────────────────────────────────────────

const MessagePage = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("userId");

  const [selectedChat, setSelectedChat] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Keep selectedChat in a ref for stable socket callbacks
  const selectedChatRef = useRef(null);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  // ── TanStack Query ─────────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: messages = [], isLoading: loadingMessages } = useMessages(selectedChat?.friendId);
  const { appendMessage, refreshConversations, markConversationRead, prefetchMessages } =
    useMessagingActions();

  // ── Call hook ──────────────────────────────────────────────────────────────
  const call = useCall({ socket, user, selectedChatRef });

  // ── Auto-select from URL ───────────────────────────────────────────────────
  useEffect(() => {
    if (initialUserId && conversations.length > 0 && !selectedChat) {
      const chat = conversations.find((c) => c.friendId === initialUserId);
      if (chat) handleSelectChat(chat);
    }
  }, [initialUserId, conversations]); // eslint-disable-line

  // ── Select Chat ────────────────────────────────────────────────────────────
  const handleSelectChat = useCallback(
    (chat) => {
      setSelectedChat(chat);
      markConversationRead(chat.friendId);
      socket?.emit("join_room", chat.friendId);
      socket?.emit("mark_as_read", { senderId: chat.friendId });
    },
    [socket, markConversationRead]
  );

  // ── Socket Events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onReceiveMessage = (message) => {
      const chat = selectedChatRef.current;
      if (chat && message.senderId === chat.friendId) {
        appendMessage(chat.friendId, message);
        socket.emit("mark_as_read", { senderId: message.senderId });
        playMessageReceiveSound();
      }
      refreshConversations();
    };

    const onMessageSent = (message) => {
      const chat = selectedChatRef.current;
      if (chat) appendMessage(chat.friendId, message);
      refreshConversations();
    };

    const onUserTyping = ({ userId, isTyping }) => {
      if (selectedChatRef.current?.friendId === userId) {
        setTypingUser(isTyping ? userId : null);
      }
    };

    const onMessagesRead = ({ userId }) => {
      if (selectedChatRef.current?.friendId === userId) refreshConversations();
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("message_sent", onMessageSent);
    socket.on("user_typing", onUserTyping);
    socket.on("messages_read", onMessagesRead);

    // Call events
    socket.on("incoming_call", call.handleIncomingCall);
    socket.on("call_accepted", call.handleCallAccepted);
    socket.on("call_rejected", () => { toast.error("Call rejected"); call.endCall(); });
    socket.on("call_ended", call.endCall);
    socket.on("call_busy", () => { toast.error("User is on another call"); call.endCall(); });
    socket.on("ice_candidate", call.handleIceCandidate);
    socket.on("call_error", (d) => { toast.error(d?.message || "Call failed"); call.endCall(); });

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("message_sent", onMessageSent);
      socket.off("user_typing", onUserTyping);
      socket.off("messages_read", onMessagesRead);
      socket.off("incoming_call", call.handleIncomingCall);
      socket.off("call_accepted", call.handleCallAccepted);
      socket.off("call_rejected");
      socket.off("call_ended");
      socket.off("call_busy");
      socket.off("ice_candidate", call.handleIceCandidate);
      socket.off("call_error");
    };
  }, [socket, appendMessage, refreshConversations, call]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#18191a]">
        <div className="text-center">
          <p className="text-white/70 mb-4">Please login to access messages</p>
          <Link href="/auth/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Active Call Screen ─────────────────────────────────────────────────────
  if (call.isInCall || call.isCalling) {
    return (
      <>
        <IncomingCallModal
          incomingCall={call.incomingCall}
          onAnswer={call.answerCall}
          onReject={call.rejectIncomingCall}
        />
        <ActiveCallScreen
          selectedChat={selectedChat}
          callType={call.callType}
          callStatus={call.callStatus}
          callDuration={call.callDuration}
          isMuted={call.isMuted}
          isVideoOff={call.isVideoOff}
          localVideoRef={call.localVideoRef}
          remoteVideoRef={call.remoteVideoRef}
          onEnd={call.endCall}
          onToggleMute={call.toggleMute}
          onToggleVideo={call.toggleVideo}
        />
      </>
    );
  }

  // ── Main Layout ────────────────────────────────────────────────────────────
  return (
    <>
      <IncomingCallModal
        incomingCall={call.incomingCall}
        onAnswer={call.answerCall}
        onReject={call.rejectIncomingCall}
      />

      <div className="fixed inset-0 bg-[#18191a] pt-16 md:pt-20">
        <div className="h-full max-w-7xl mx-auto flex overflow-hidden">

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <ConversationList
            conversations={conversations}
            isLoading={loadingConversations}
            selectedChat={selectedChat}
            onlineUsers={onlineUsers}
            onSelect={handleSelectChat}
            onPrefetch={prefetchMessages}
          />

          {/* ── Chat Area ─────────────────────────────────────────────────── */}
          {selectedChat ? (
            <div className="flex-1 flex flex-col bg-[#18191a] min-w-0">
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#242526] border-b border-[#3a3b3c] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 transition"
                  >
                    <ArrowLeftIcon className="h-5 w-5 text-white" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {selectedChat.friendProfilePicture ? (
                        <Image
                          src={selectedChat.friendProfilePicture}
                          alt={selectedChat.friendName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    {onlineUsers.includes(selectedChat.friendId) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#242526]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{selectedChat.friendName}</h3>
                    <p className="text-[11px] text-white/50">
                      {onlineUsers.includes(selectedChat.friendId) ? "Active now" : "Offline"}
                    </p>
                  </div>
                </div>

                {/* Call buttons */}
                <div className="flex items-center gap-1">
                  {["audio", "video"].map((type) => (
                    <button
                      key={type}
                      onClick={() => call.startCall(type, onlineUsers)}
                      disabled={
                        !onlineUsers.includes(selectedChat.friendId) ||
                        call.isCalling ||
                        call.isInCall
                      }
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                        onlineUsers.includes(selectedChat.friendId) &&
                        !call.isCalling &&
                        !call.isInCall
                          ? "bg-[#3a3b3c] hover:bg-[#4e4f50] text-blue-400"
                          : "bg-[#2c2d2e] text-white/20 cursor-not-allowed"
                      }`}
                    >
                      {type === "audio" ? (
                        <PhoneIcon className="h-4 w-4" />
                      ) : (
                        <VideoCameraIcon className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              {loadingMessages ? (
                <MessageListSkeleton />
              ) : (
                <MessageList
                  messages={messages}
                  userId={user?._id}
                  chat={selectedChat}
                  typingUser={typingUser}
                />
              )}

              {/* Input */}
              <ChatInput
                selectedChat={selectedChat}
                socket={socket}
                uploadingFile={uploadingFile}
                setUploadingFile={setUploadingFile}
              />
            </div>
          ) : (
            /* Empty state */
            <div className="hidden md:flex flex-1 items-center justify-center bg-[#18191a]">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-[#3a3b3c] flex items-center justify-center mx-auto mb-4">
                  <PhoneSolidIcon className="h-9 w-9 text-white/30" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-1">Your messages</h3>
                <p className="text-white/40 text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        video, audio { pointer-events: auto; }
      `}</style>
    </>
  );
};

export default MessagePage;