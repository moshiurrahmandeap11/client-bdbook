// ─────────────────────────────────────────────────────────────────────────────
// PART 8: components/messaging/ConversationList.jsx
// Left sidebar — search, conversation list, skeleton loader, prefetch on hover
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { formatTime } from "@/app/utils/messageUtils";
import { MagnifyingGlassIcon, UserIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { memo, useMemo, useState } from "react";
import { ConversationListSkeleton } from "./Skeletons";

// ── Single Conversation Row ──────────────────────────────────────────────────
const ConversationRow = memo(
  ({ chat, isActive, isOnline, onSelect, onPrefetch }) => (
    <button
      key={chat.friendId}
      onClick={() => onSelect(chat)}
      onMouseEnter={() => onPrefetch(chat.friendId)} // prefetch on hover → instant open
      className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-xl transition-all duration-150 ${
        isActive ? "bg-[#3a3b3c]" : "hover:bg-[#3a3b3c]"
      }`}
      style={{ width: "calc(100% - 8px)" }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          {chat.friendProfilePicture ? (
            <Image
              src={chat.friendProfilePicture}
              alt={chat.friendName}
              width={56}
              height={56}
              className="object-cover"
            />
          ) : (
            <UserIcon className="h-7 w-7 text-white" />
          )}
        </div>
        {isOnline && (
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#242526]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex justify-between items-baseline">
          <span
            className={`font-semibold text-sm truncate ${
              chat.unreadCount > 0 ? "text-white" : "text-white/80"
            }`}
          >
            {chat.friendName}
          </span>
          {chat.updatedAt && (
            <span className="text-[11px] text-white/40 ml-2 flex-shrink-0">
              {formatTime(chat.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p
            className={`text-xs truncate ${
              chat.unreadCount > 0 ? "text-white font-medium" : "text-white/50"
            }`}
          >
            {chat.lastMessage
              ? typeof chat.lastMessage === "string"
                ? chat.lastMessage
                : "New message"
              : "Say hi! 👋"}
          </p>
          {chat.unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
);
ConversationRow.displayName = "ConversationRow";

// ── ConversationList ─────────────────────────────────────────────────────────
export const ConversationList = memo(
  ({ conversations, isLoading, selectedChat, onlineUsers, onSelect, onPrefetch }) => {
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = useMemo(
      () =>
        conversations.filter((c) =>
          c.friendName?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      [conversations, searchQuery]
    );

    return (
      <div
        className={`
          w-full md:w-[360px] flex-shrink-0 bg-[#242526] flex flex-col border-r border-[#3a3b3c]
          ${selectedChat ? "hidden md:flex" : "flex"}
        `}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#3a3b3c]">
          <h2 className="text-white text-2xl font-bold mb-3">Chats</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Messenger"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#3a3b3c] text-white text-sm rounded-full py-2 pl-9 pr-4 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 overscroll-contain">
          {isLoading ? (
            <ConversationListSkeleton />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-sm">
              {searchQuery ? "No results found" : "No conversations yet"}
            </div>
          ) : (
            filtered.map((chat) => (
              <ConversationRow
                key={chat.friendId}
                chat={chat}
                isActive={selectedChat?.friendId === chat.friendId}
                isOnline={onlineUsers.includes(chat.friendId)}
                onSelect={onSelect}
                onPrefetch={onPrefetch}
              />
            ))
          )}
        </div>
      </div>
    );
  }
);
ConversationList.displayName = "ConversationList";