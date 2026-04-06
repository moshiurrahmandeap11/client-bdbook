// ─────────────────────────────────────────────────────────────────────────────
// PART 2: hooks/useMessaging.js
// TanStack Query hooks — conversations + messages with caching & optimistic updates
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import axiosInstance from "@/app/lib/axiosInstance";
import { QUERY_KEYS } from "@/app/utils/messageUtils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// ── API Functions ────────────────────────────────────────────────────────────
const fetchConversations = async () => {
  const res = await axiosInstance.get("/users/conversations");
  if (!res.data.success) throw new Error("Failed to fetch conversations");
  return res.data.data;
};

const fetchMessages = async (friendId) => {
  const res = await axiosInstance.get(`/users/messages/${friendId}`);
  if (!res.data.success) throw new Error("Failed to fetch messages");
  return res.data.data;
};

// ── Conversations Hook ───────────────────────────────────────────────────────
export const useConversations = () =>
  useQuery({
    queryKey: QUERY_KEYS.conversations,
    queryFn: fetchConversations,
    staleTime: 30_000,          // 30s fresh — no refetch on every focus
    gcTime: 5 * 60 * 1000,      // keep in cache 5 min
    refetchOnWindowFocus: false,
  });

// ── Messages Hook ────────────────────────────────────────────────────────────
export const useMessages = (friendId) =>
  useQuery({
    queryKey: QUERY_KEYS.messages(friendId),
    queryFn: () => fetchMessages(friendId),
    enabled: !!friendId,
    staleTime: 10_000,          // messages stay fresh 10s
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev, // keeps old data visible while reloading
  });

// ── Socket-Driven Cache Updates ──────────────────────────────────────────────
// Call these from socket event handlers — they surgically update cache
// without full refetch, giving instant WhatsApp-like feel.

export const useMessagingActions = () => {
  const queryClient = useQueryClient();

  /** Append a new message to the cached list (receive or send) */
  const appendMessage = useCallback(
    (friendId, message) => {
      queryClient.setQueryData(QUERY_KEYS.messages(friendId), (prev = []) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    },
    [queryClient]
  );

  /** Refresh just the conversation list (last message, unread count) */
  const refreshConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
  }, [queryClient]);

  /** Optimistically mark a specific conversation as read */
  const markConversationRead = useCallback(
    (friendId) => {
      queryClient.setQueryData(QUERY_KEYS.conversations, (prev = []) =>
        prev.map((c) =>
          c.friendId === friendId ? { ...c, unreadCount: 0 } : c
        )
      );
    },
    [queryClient]
  );

  /** Prefetch messages when user hovers a conversation (instant open) */
  const prefetchMessages = useCallback(
    (friendId) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.messages(friendId),
        queryFn: () => fetchMessages(friendId),
        staleTime: 10_000,
      });
    },
    [queryClient]
  );

  return { appendMessage, refreshConversations, markConversationRead, prefetchMessages };
};