"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Send,
  Search,
  Image as ImageIcon,
  ThumbsUp,
  Check,
  CheckCheck,
  ArrowLeft,
  ExternalLink,
  X,
  MessageSquare,
  Phone,
  Video as VideoIcon,
  Loader2,
  FileText,
  Smile,
  Users,
  Plus,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSocket } from "@/components/providers/SocketProvider";
import { useCall } from "@/components/providers/CallProvider";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  uploadMessageMedia,
  acceptMessageRequest,
  declineMessageRequest,
  reactToMessage,
} from "@/services/message.service";
import { getUserById } from "@/services/user.service";
import apiClient from "@/lib/axios";
import { IConversation, IMessage, IMessageReaction } from "@/types/message.types";
import { IUser } from "@/types/user.types";
import ReactionPicker from "@/components/message/ReactionPicker";
import CreateGroupModal from "@/components/message/CreateGroupModal";

interface SharedPostData {
  type?: string;
  postId?: string;
  postUrl?: string;
  postText?: string;
  postAuthor?: string;
  postAuthorProfilePic?: string;
  hasMedia?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  sharedBy?: string;
  sharedByProfilePic?: string;
}

// Format message timestamp (e.g. "3:45 PM")
function formatMessageTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Format relative time for conversation list
function formatConversationTime(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// Get day grouping label
function getDayDividerLabel(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

// Safe parser for shared post payload
function parseSharedPost(rawText?: string | null): SharedPostData | null {
  if (!rawText) return null;
  try {
    const trimmed = rawText.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
    const parsed = JSON.parse(trimmed);
    if (parsed && (parsed.type === "post_share" || parsed.postId)) {
      return parsed as SharedPostData;
    }
    return null;
  } catch {
    return null;
  }
}

// Shared Post Preview Card Component
function SharedPostBubble({ data, isMine }: { data: SharedPostData; isMine: boolean }) {
  const postUrl = data.postId ? `/post/details/${data.postId}` : "#";

  return (
    <div
      className={`rounded-2xl overflow-hidden border max-w-sm sm:max-w-md my-1 text-left shadow-2xs transition-all ${
        isMine
          ? "bg-card border-white/20 text-foreground"
          : "bg-card border-border text-foreground"
      }`}
    >
      {/* Author Bar */}
      <div className="p-3 pb-2 flex items-center gap-2 border-b border-border/50 bg-fb-canvas/50">
        <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center overflow-hidden shrink-0">
          {data.postAuthorProfilePic ? (
            <img
              src={data.postAuthorProfilePic}
              alt={data.postAuthor || "Author"}
              className="w-full h-full object-cover"
            />
          ) : (
            (data.postAuthor || "U").charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">
            {data.postAuthor || "Post Author"}
          </p>
          <p className="text-[10px] text-muted">Shared a post</p>
        </div>
      </div>

      {/* Post Text */}
      {data.postText && (
        <div className="p-3 text-xs text-foreground/90 whitespace-pre-wrap line-clamp-3">
          {data.postText}
        </div>
      )}

      {/* Media Preview */}
      {data.hasMedia && data.mediaUrl && (
        <div className="relative w-full max-h-56 bg-black/5 overflow-hidden flex items-center justify-center">
          {data.mediaType === "video" || data.mediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
            <video
              src={data.mediaUrl}
              className="w-full max-h-56 object-cover"
              controls={false}
              muted
              playsInline
            />
          ) : (
            <img
              src={data.mediaUrl}
              alt="Shared media"
              className="w-full max-h-56 object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* View Post Action Button */}
      <Link
        href={postUrl}
        className="flex items-center justify-between p-2.5 px-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors border-t border-border/50"
      >
        <span>View Full Post</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function MessageContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const { startCall, callState } = useCall();

  const currentUserId = user?.id || (user as any)?._id;

  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    avatar?: string | null;
  } | null>(null);

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "unread">("all");
  const [processingRequest, setProcessingRequest] = useState(false);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [sending, setSending] = useState(false);

  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const [searchResults, setSearchResults] = useState<IUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Fetch initial conversations list
  useEffect(() => {
    let isMounted = true;
    setLoadingConversations(true);

    getConversations()
      .then((data) => {
        if (!isMounted) return;
        setConversations(data || []);
      })
      .catch(() => {
        if (!isMounted) return;
        setConversations([]);
      })
      .finally(() => {
        if (isMounted) setLoadingConversations(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle URL param ?userId=... or ?friendId=... to auto-open chat
  useEffect(() => {
    const paramUserId = searchParams.get("userId") || searchParams.get("friendId");
    if (!paramUserId || paramUserId === currentUserId) return;

    setSelectedUserId(paramUserId);

    // Check if user already exists in conversations
    const existing = conversations.find(
      (c) => c.friendId === paramUserId || c.id === paramUserId
    );

    if (existing) {
      setSelectedUser({
        id: existing.friendId || existing.id,
        name: existing.friendName || "User",
        avatar: existing.friendProfilePicture,
      });
    } else {
      // Fetch user profile details to populate header
      getUserById(paramUserId)
        .then((fetchedUser) => {
          if (!fetchedUser) return;
          const name = fetchedUser.fullName || fetchedUser.name || "User";
          const avatar =
            fetchedUser.profilePicUrl ||
            (typeof fetchedUser.profilePicture === "object"
              ? fetchedUser.profilePicture?.url
              : fetchedUser.profilePicture) ||
            fetchedUser.avatar;

          setSelectedUser({
            id: paramUserId,
            name,
            avatar,
          });

          // Prepend a temporary conversation item so it appears in the list
          setConversations((prev) => {
            if (prev.some((c) => c.friendId === paramUserId)) return prev;
            const newConv: IConversation = {
              id: paramUserId,
              friendId: paramUserId,
              friendName: name,
              friendProfilePicture: avatar,
              lastMessage: "Started a conversation",
              unreadCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isRequest: false,
            };
            return [newConv, ...prev];
          });
        })
        .catch(() => {});
    }
  }, [searchParams, conversations, currentUserId]);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      setSelectedUser(null);
      return;
    }

    setIsPartnerTyping(false);
    setLoadingMessages(true);

    // Sync selected user details from conversation list if missing
    const currentConv = conversations.find(
      (c) => c.friendId === selectedUserId || c.id === selectedUserId
    );
    if (currentConv) {
      setSelectedUser({
        id: currentConv.friendId || currentConv.id,
        name: currentConv.friendName || "User",
        avatar: currentConv.friendProfilePicture,
      });
    }

    getMessages(selectedUserId)
      .then((data) => {
        setMessages(data || []);
        // Scroll to bottom immediately
        setTimeout(() => scrollToBottom(false), 50);
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => {
        setLoadingMessages(false);
      });

    // Mark conversation as read on HTTP & Socket ONLY if not a message request
    if (!currentConv?.isRequest) {
      markAsRead(selectedUserId).catch(() => {});
      if (socket) {
        socket.emit("mark_as_read", { senderId: selectedUserId });
      }

      // Reset unread count locally for this conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.friendId === selectedUserId || c.id === selectedUserId
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
    }
  }, [selectedUserId, socket, scrollToBottom]);

  // Listen to incoming socket messages & events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: IMessage) => {
      const isGroupMessage = Boolean(
        msg.conversationId && (!msg.receiverId || msg.receiverId === "null")
      );
      const partnerId = isGroupMessage
        ? msg.conversationId!
        : msg.senderId === currentUserId
        ? msg.receiverId!
        : msg.senderId;

      // If message is in currently active chat
      if (
        selectedUserId &&
        (partnerId === selectedUserId ||
          msg.senderId === selectedUserId ||
          msg.receiverId === selectedUserId ||
          msg.conversationId === selectedUserId)
      ) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === msg.id || (m.tempId && m.tempId === msg.tempId))) {
            return prev.map((m) =>
              m.tempId && m.tempId === msg.tempId ? { ...msg } : m
            );
          }
          return [...prev, msg];
        });

        // If message is from partner, mark as read ONLY if not a message request
        if (msg.senderId !== currentUserId) {
          setConversations((prev) => {
            const partnerConv = prev.find(
              (c) => c.friendId === selectedUserId || c.id === selectedUserId
            );
            if (!partnerConv?.isRequest) {
              markAsRead(selectedUserId).catch(() => {});
              socket.emit("mark_as_read", { senderId: selectedUserId });
            }
            return prev;
          });
        }

        setTimeout(() => scrollToBottom(true), 100);
      }

      // Update conversations sidebar
      setConversations((prev) => {
        const existingIdx = prev.findIndex(
          (c) => c.friendId === partnerId || c.id === partnerId
        );

        let previewText = msg.message || msg.text || "";
        if (msg.messageType === "share") previewText = "Shared a post";
        else if (msg.messageType === "image") previewText = "Photo";
        else if (msg.messageType === "video") previewText = "Video";
        else if (msg.messageType === "file") previewText = "Attachment";

        const isCurrentlyActive = selectedUserId === partnerId;

        if (existingIdx !== -1) {
          const updated = [...prev];
          const conv = updated[existingIdx];
          updated.splice(existingIdx, 1);
          updated.unshift({
            ...conv,
            lastMessage: previewText,
            updatedAt: msg.createdAt || new Date().toISOString(),
            unreadCount: isCurrentlyActive && !conv.isRequest ? 0 : (conv.unreadCount || 0) + 1,
          });
          return updated;
        } else {
          // If a new partner sends a message, fetch updated conversations to get correct follow/request flags
          getConversations().then((data) => {
            if (data) setConversations(data);
          });
          return prev;
        }
      });
    };

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      if (selectedUserId && data.userId === selectedUserId) {
        setIsPartnerTyping(Boolean(data.isTyping));
        if (data.isTyping) {
          setTimeout(() => scrollToBottom(true), 100);
        }
      }
    };

    const handleMessagesRead = (data: { userId: string }) => {
      if (selectedUserId && data.userId === selectedUserId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.receiverId === selectedUserId ? { ...m, isRead: true } : m
          )
        );
      }
    };

    const handleMessageReaction = (data: {
      messageId: string;
      reactions: IMessageReaction[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m
        )
      );
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("messages_read", handleMessagesRead);
    socket.on("message_reaction", handleMessageReaction);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_reaction", handleMessageReaction);
    };
  }, [socket, selectedUserId, currentUserId, scrollToBottom]);

  // Handle typing indicator broadcast to socket
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (!socket || !selectedUserId) return;

    socket.emit("typing", { receiverId: selectedUserId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && selectedUserId) {
        socket.emit("typing", { receiverId: selectedUserId, isTyping: false });
      }
    }, 2000);
  };

  // Handle selecting a media attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size cannot exceed 15MB");
      return;
    }

    setMediaFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  };

  // Remove media attachment
  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId || sending) return;

    const trimmedText = text.trim();
    if (!trimmedText && !mediaFile) return;

    setSending(true);

    // Stop typing indicator immediately
    if (socket) {
      socket.emit("typing", { receiverId: selectedUserId, isTyping: false });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    let uploadedMediaUrl: string | null = null;
    let uploadedFileName: string | null = null;
    let uploadedFileSize: number | null = null;
    let messageType: "text" | "image" | "video" | "file" = "text";

    if (mediaFile) {
      try {
        setUploadingMedia(true);
        const uploadRes = await uploadMessageMedia(mediaFile);
        uploadedMediaUrl = uploadRes.url;
        uploadedFileName = uploadRes.name;
        uploadedFileSize = uploadRes.size;
        messageType =
          uploadRes.type === "image"
            ? "image"
            : uploadRes.type === "video"
            ? "video"
            : "file";
      } catch {
        toast.error("Failed to upload media. Please try again.");
        setUploadingMedia(false);
        setSending(false);
        return;
      } finally {
        setUploadingMedia(false);
      }
    }

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: IMessage = {
      id: tempId,
      tempId,
      senderId: currentUserId || "me",
      receiverId: selectedUserId,
      message: trimmedText || (mediaFile ? uploadedFileName : ""),
      text: trimmedText || (mediaFile ? uploadedFileName : ""),
      messageType,
      mediaUrl: uploadedMediaUrl,
      fileName: uploadedFileName,
      fileSize: uploadedFileSize,
      isRead: false,
      isDelivered: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistically append message
    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    handleRemoveMedia();
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const serverMessage = await sendMessage({
        receiverId: selectedUserId,
        message: optimisticMessage.message || "",
        messageType,
        mediaUrl: uploadedMediaUrl,
        fileName: uploadedFileName,
        fileSize: uploadedFileSize,
        tempId,
      });

      // Update optimistic message with server returned message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...serverMessage, tempId } : m))
      );

      // Update sidebar preview
      setConversations((prev) => {
        const existingIdx = prev.findIndex(
          (c) => c.friendId === selectedUserId || c.id === selectedUserId
        );
        let preview = optimisticMessage.message || "Attachment";
        if (messageType === "image") preview = "Photo";
        else if (messageType === "video") preview = "Video";
        else if (messageType === "file") preview = "Attachment";

        if (existingIdx !== -1) {
          const updated = [...prev];
          const conv = updated[existingIdx];
          updated.splice(existingIdx, 1);
          updated.unshift({
            ...conv,
            lastMessage: preview,
            updatedAt: new Date().toISOString(),
          });
          return updated;
        }
        return prev;
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      // Remove failed optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Quick Like 👍 button handler
  const handleSendLike = async () => {
    if (!selectedUserId || sending) return;
    setText("👍");
    // Trigger sending in next tick
    setTimeout(() => {
      handleSendMessage();
    }, 10);
  };

  // Enter to send key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Search users if no conversations match search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const res = await apiClient.get(
          `/users/search/${encodeURIComponent(searchQuery.trim())}`
        );
        const users = res.data?.data || [];
        setSearchResults(
          users.filter((u: IUser) => (u.id || (u as any)._id) !== currentUserId)
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  // Accept message request handler
  const handleAcceptRequest = async () => {
    if (!selectedUserId || processingRequest) return;
    try {
      setProcessingRequest(true);
      await acceptMessageRequest(selectedUserId);

      // 1. Mark request as regular conversation locally
      setConversations((prev) =>
        prev.map((c) =>
          c.friendId === selectedUserId || c.id === selectedUserId
            ? { ...c, isRequest: false, unreadCount: 0 }
            : c
        )
      );

      // 2. Mark as read on HTTP & Socket now that request is accepted
      markAsRead(selectedUserId).catch(() => {});
      if (socket) {
        socket.emit("mark_as_read", { senderId: selectedUserId });
      }

      toast.success("Message request accepted! You can now chat.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to accept request");
    } finally {
      setProcessingRequest(false);
    }
  };

  // Decline message request handler
  const handleDeclineRequest = async () => {
    if (!selectedUserId || processingRequest) return;
    try {
      setProcessingRequest(true);
      await declineMessageRequest(selectedUserId);

      // Remove conversation from state
      setConversations((prev) =>
        prev.filter(
          (c) => c.friendId !== selectedUserId && c.id !== selectedUserId
        )
      );
      setMessages([]);
      setSelectedUserId(null);
      setSelectedUser(null);

      toast.success("Message request declined and deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to decline request");
    } finally {
      setProcessingRequest(false);
    }
  };

  // Handle reaction on message
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    // 1. Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = m.reactions || [];
        const existingIdx = currentReactions.findIndex((r) => r.userId === currentUserId);

        let newReactions: IMessageReaction[];
        if (existingIdx !== -1) {
          if (currentReactions[existingIdx].reaction === emoji) {
            // Remove reaction (toggle off)
            newReactions = currentReactions.filter((r) => r.userId !== currentUserId);
          } else {
            // Update to new emoji
            newReactions = [...currentReactions];
            newReactions[existingIdx] = {
              ...newReactions[existingIdx],
              reaction: emoji,
            };
          }
        } else {
          // Add new
          newReactions = [
            ...currentReactions,
            {
              id: `temp-${Date.now()}`,
              messageId,
              userId: currentUserId,
              userName: user?.fullName || (user as any)?.name || "You",
              userAvatar:
                (user as any)?.profilePicUrl ||
                (user as any)?.avatar ||
                null,
              reaction: emoji,
            },
          ];
        }
        return { ...m, reactions: newReactions };
      })
    );

    setActiveReactionPickerMessageId(null);

    // 2. Call backend & Socket
    try {
      if (socket) {
        socket.emit("react_message", { messageId, reaction: emoji });
      }
      const res = await reactToMessage(messageId, emoji);
      if (res?.reactions) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, reactions: res.reactions } : m
          )
        );
      }
    } catch {
      // Non-blocking
    }
  };

  // Current active conversation helper
  const selectedConversation = useMemo(() => {
    if (!selectedUserId) return null;
    return (
      conversations.find(
        (c) => c.friendId === selectedUserId || c.id === selectedUserId
      ) || null
    );
  }, [conversations, selectedUserId]);

  const isSelectedUserRequest = Boolean(selectedConversation?.isRequest);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        !searchQuery.trim() ||
        c.friendName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());

      let matchTab = false;
      if (activeTab === "requests") {
        matchTab = Boolean(c.isRequest);
      } else if (activeTab === "unread") {
        matchTab = !c.isRequest && Boolean(c.unreadCount && c.unreadCount > 0);
      } else {
        // "all" = main chats
        matchTab = !c.isRequest;
      }

      return matchSearch && matchTab;
    });
  }, [conversations, searchQuery, activeTab]);

  const requestsCount = useMemo(() => {
    return conversations.filter((c) => c.isRequest).length;
  }, [conversations]);

  const totalUnreadCount = useMemo(() => {
    return conversations
      .filter((c) => !c.isRequest)
      .reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Group messages by day
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: IMessage[] }[] = [];
    let currentLabel = "";
    let currentItems: IMessage[] = [];

    messages.forEach((msg) => {
      const label = getDayDividerLabel(msg.createdAt);
      if (label !== currentLabel) {
        if (currentItems.length > 0) {
          groups.push({ dateLabel: currentLabel, items: currentItems });
        }
        currentLabel = label;
        currentItems = [msg];
      } else {
        currentItems.push(msg);
      }
    });

    if (currentItems.length > 0) {
      groups.push({ dateLabel: currentLabel, items: currentItems });
    }

    return groups;
  }, [messages]);

  return (
    <div className="h-[calc(100vh-4.25rem)] max-w-7xl mx-auto p-0 md:p-3 flex overflow-hidden">
      <div className="w-full h-full bg-card md:rounded-2xl md:border md:border-border shadow-xs flex overflow-hidden">
        {/* ============================================================== */}
        {/* LEFT COLUMN: CONVERSATIONS SIDEBAR                             */}
        {/* ============================================================== */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card shrink-0 ${
            selectedUserId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-border/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Chats</h1>
                {totalUnreadCount > 0 && (
                  <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                title="Create Group Chat"
                className="fb-btn-circle w-8 h-8 text-muted hover:text-primary transition cursor-pointer flex items-center justify-center hover:bg-fb-btn"
              >
                <Users className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="fb-input-pill flex items-center gap-2 px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary/40 focus-within:bg-card">
                <Search className="w-4 h-4 text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Search chats and friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-muted hover:text-foreground p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs (Chats / Requests / Unread) */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 text-xs rounded-full transition font-medium ${
                  activeTab === "all"
                    ? "bg-primary text-white"
                    : "bg-fb-btn hover:bg-fb-btn-hover text-foreground"
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-3 py-1 text-xs rounded-full transition font-medium flex items-center gap-1.5 ${
                  activeTab === "requests"
                    ? "bg-primary text-white"
                    : "bg-fb-btn hover:bg-fb-btn-hover text-foreground"
                }`}
              >
                <span>Requests</span>
                {requestsCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === "requests"
                        ? "bg-white text-primary"
                        : "bg-primary text-white"
                    }`}
                  >
                    {requestsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`px-3 py-1 text-xs rounded-full transition font-medium flex items-center gap-1.5 ${
                  activeTab === "unread"
                    ? "bg-primary text-white"
                    : "bg-fb-btn hover:bg-fb-btn-hover text-foreground"
                }`}
              >
                <span>Unread</span>
                {totalUnreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === "unread" ? "bg-white text-primary" : "bg-primary text-white"
                    }`}
                  >
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-1.5">
            {loadingConversations ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-fb-btn shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-fb-btn rounded-md w-3/4" />
                      <div className="h-2.5 bg-fb-btn rounded-md w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 && searchResults.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-muted gap-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <p className="text-sm font-medium">
                  {activeTab === "requests"
                    ? "No message requests"
                    : activeTab === "unread"
                    ? "No unread messages"
                    : "No conversations found"}
                </p>
                <p className="text-xs text-muted/80">
                  {activeTab === "requests"
                    ? "Messages from people you don't follow will appear here"
                    : activeTab === "unread"
                    ? "You're all caught up!"
                    : "Search a user's name to start a chat"}
                </p>
              </div>
            ) : (
              <>
                {/* Existing Conversations */}
                {filteredConversations.map((conv) => {
                  const partnerId = conv.friendId || conv.id;
                  const isSelected = selectedUserId === partnerId;
                  const isOnline = isUserOnline(partnerId);
                  const hasUnread = Boolean(conv.unreadCount && conv.unreadCount > 0);

                  return (
                    <button
                      key={conv.id || conv.friendId}
                      onClick={() => {
                        setSelectedUserId(partnerId);
                        setSelectedUser({
                          id: partnerId,
                          name: conv.friendName || "User",
                          avatar: conv.friendProfilePicture,
                        });
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-fb-btn-hover/60 text-foreground"
                      }`}
                    >
                      {/* Avatar with Online Status */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center overflow-hidden border border-border/80">
                          {conv.friendProfilePicture ? (
                            <img
                              src={conv.friendProfilePicture}
                              alt={conv.friendName || "User"}
                              className="w-full h-full object-cover"
                            />
                          ) : conv.isGroup ? (
                            <div className="w-full h-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white">
                              <Users className="w-6 h-6" />
                            </div>
                          ) : (
                            (conv.friendName || "U").charAt(0).toUpperCase()
                          )}
                        </div>
                        {!conv.isGroup && isOnline && (
                          <span
                            className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card ring-1 ring-emerald-500/20"
                            title="Active now"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4
                            className={`text-sm truncate ${
                              hasUnread
                                ? "font-bold text-foreground"
                                : isSelected
                                ? "font-semibold text-primary"
                                : "font-medium text-foreground"
                            }`}
                          >
                            {conv.friendName || "User"}
                          </h4>
                          <span className="text-[11px] text-muted shrink-0">
                            {formatConversationTime(conv.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              hasUnread
                                ? "font-semibold text-foreground"
                                : "text-muted"
                            }`}
                          >
                            {conv.lastMessage || "Started a conversation"}
                          </p>
                          {conv.isRequest ? (
                            <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                              Request
                            </span>
                          ) : (
                            hasUnread && (
                              <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                                {conv.unreadCount}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Search Results (When searching for new users) */}
                {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                  <div className="pt-3">
                    <p className="px-3 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Search Results
                    </p>
                    {searchResults.map((sr) => {
                      const srId = sr.id || (sr as any)._id;
                      const srAvatar =
                        sr.profilePicUrl ||
                        (typeof sr.profilePicture === "object"
                          ? sr.profilePicture?.url
                          : sr.profilePicture) ||
                        sr.avatar;
                      const srName = sr.fullName || sr.name || "User";
                      const isOnline = isUserOnline(srId);

                      return (
                        <button
                          key={srId}
                          onClick={() => {
                            setSelectedUserId(srId);
                            setSelectedUser({
                              id: srId,
                              name: srName,
                              avatar: srAvatar,
                            });
                            setSearchQuery("");
                          }}
                          className="w-full p-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-fb-btn-hover/60 transition text-foreground"
                        >
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center overflow-hidden border border-border/80">
                              {srAvatar ? (
                                <img
                                  src={srAvatar}
                                  alt={srName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                srName.charAt(0).toUpperCase()
                              )}
                            </div>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {srName}
                            </h4>
                            <p className="text-xs text-muted">Tap to message</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {searchingUsers && (
                  <div className="p-3 text-center text-xs text-muted flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching people...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: ACTIVE CHAT PANEL                                */}
        {/* ============================================================== */}
        <div
          className={`flex-1 flex flex-col h-full bg-canvas/30 dark:bg-slate-900/30 overflow-hidden ${
            !selectedUserId ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 border-b border-border bg-card flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="md:hidden p-1.5 rounded-full hover:bg-fb-btn text-muted hover:text-foreground transition -ml-1"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Partner / Group Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center overflow-hidden border border-border/80">
                      {selectedUser?.avatar ? (
                        <img
                          src={selectedUser.avatar}
                          alt={selectedUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : selectedConversation?.isGroup ? (
                        <div className="w-full h-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white">
                          <Users className="w-5 h-5" />
                        </div>
                      ) : (
                        (selectedUser?.name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    {!selectedConversation?.isGroup && isUserOnline(selectedUserId) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                    )}
                  </div>

                  {/* Partner / Group Info */}
                  <div className="min-w-0">
                    {selectedConversation?.isGroup ? (
                      <h3 className="text-sm font-semibold text-foreground truncate block">
                        {selectedUser?.name || "Group Chat"}
                      </h3>
                    ) : (
                      <Link
                        href={`/s/${selectedUserId}`}
                        className="text-sm font-semibold text-foreground hover:underline truncate block"
                      >
                        {selectedUser?.name || "User"}
                      </Link>
                    )}
                    <p className="text-[11px] text-muted flex items-center gap-1.5">
                      {selectedConversation?.isGroup ? (
                        <span>
                          {selectedConversation.participants?.length || 2} members
                        </span>
                      ) : isPartnerTyping ? (
                        <span className="text-primary font-medium animate-pulse">
                          Typing...
                        </span>
                      ) : isUserOnline(selectedUserId) ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span>Active now</span>
                        </>
                      ) : (
                        <span>Offline</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {!isSelectedUserRequest && !selectedConversation?.isGroup && (
                    <>
                      <button
                        type="button"
                        title="Audio call"
                        onClick={() => {
                          if (!selectedUserId || !selectedUser) return;
                          startCall({
                            partnerId: selectedUserId,
                            partnerName: selectedUser.name,
                            partnerAvatar: selectedUser.avatar,
                            type: "audio",
                          });
                        }}
                        disabled={callState !== "idle"}
                        className="fb-btn-circle w-9 h-9 text-muted hover:text-primary transition disabled:opacity-40 cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Video call"
                        onClick={() => {
                          if (!selectedUserId || !selectedUser) return;
                          startCall({
                            partnerId: selectedUserId,
                            partnerName: selectedUser.name,
                            partnerAvatar: selectedUser.avatar,
                            type: "video",
                          });
                        }}
                        disabled={callState !== "idle"}
                        className="fb-btn-circle w-9 h-9 text-muted hover:text-primary transition disabled:opacity-40 cursor-pointer"
                      >
                        <VideoIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {!selectedConversation?.isGroup && (
                    <Link
                      href={`/s/${selectedUserId}`}
                      title="View Profile"
                      className="fb-btn-circle w-9 h-9 text-muted hover:text-foreground transition ml-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Message Scroll Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-muted gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                      {(selectedUser?.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">
                        {selectedUser?.name}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {isSelectedUserRequest
                          ? "This user sent you a message request."
                          : "You're connected on Stalk. Say hi to start the conversation!"}
                      </p>
                    </div>
                    {!isSelectedUserRequest && (
                      <button
                        onClick={() => {
                          setText("👋 Hello!");
                          setTimeout(() => handleSendMessage(), 10);
                        }}
                        className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-full transition"
                      >
                        👋 Wave Hello
                      </button>
                    )}
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.dateLabel} className="space-y-3">
                      {/* Day divider badge */}
                      <div className="flex justify-center my-2">
                        <span className="text-[11px] font-medium text-muted bg-card border border-border px-3 py-0.5 rounded-full shadow-2xs">
                          {group.dateLabel}
                        </span>
                      </div>

                      {group.items.map((msg, idx) => {
                        const isMine = msg.senderId === currentUserId;
                        const isLatestMessage =
                          idx === group.items.length - 1 &&
                          group.dateLabel ===
                            groupedMessages[groupedMessages.length - 1].dateLabel;

                        const sharedPost =
                          msg.messageType === "share"
                            ? parseSharedPost(msg.message || msg.text)
                            : null;

                        const partnerAvatar = selectedConversation?.isGroup
                          ? msg.senderProfilePicture || (msg.sender as any)?.profilePicUrl || null
                          : selectedUser?.avatar;

                        const partnerDisplayName = selectedConversation?.isGroup
                          ? msg.senderName || (msg.sender as any)?.fullName || "Member"
                          : selectedUser?.name || "User";

                        const hasReactions = Boolean(msg.reactions && msg.reactions.length > 0);
                        const userReaction = (msg.reactions || []).find(
                          (r) => r.userId === currentUserId
                        );

                        return (
                          <div
                            key={msg.id || msg._id || idx}
                            className={`group relative flex ${
                              isMine ? "justify-end" : "justify-start"
                            } items-end gap-1.5 my-1`}
                          >
                            {/* Partner avatar beside message if received */}
                            {!isMine && (
                              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center overflow-hidden shrink-0 mb-1 border border-border">
                                {partnerAvatar ? (
                                  <img
                                    src={partnerAvatar}
                                    alt={partnerDisplayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  partnerDisplayName.charAt(0).toUpperCase()
                                )}
                              </div>
                            )}

                            {/* Message Bubble Column */}
                            <div
                              className={`flex flex-col ${
                                isMine ? "items-end" : "items-start"
                              } max-w-[85%] sm:max-w-md`}
                            >
                              {/* Group Member Name */}
                              {!isMine && selectedConversation?.isGroup && (
                                <span className="text-[11px] font-semibold text-muted ml-1 mb-0.5 truncate max-w-[200px]">
                                  {partnerDisplayName}
                                </span>
                              )}

                              {/* Relative wrapper for bubble + reaction badge */}
                              <div className={`relative ${hasReactions ? "mb-2.5" : ""}`}>
                                {/* Rich Shared Post Card */}
                                {sharedPost ? (
                                  <SharedPostBubble data={sharedPost} isMine={isMine} />
                                ) : (
                                  <div
                                    className={`rounded-2xl px-4 py-2 text-sm shadow-2xs break-words ${
                                      isMine
                                        ? "bg-primary text-white rounded-br-xs"
                                        : "bg-card border border-border text-foreground rounded-bl-xs"
                                    }`}
                                  >
                                    {/* Media Image */}
                                    {msg.messageType === "image" && msg.mediaUrl && (
                                      <div className="rounded-xl overflow-hidden mb-1.5 max-h-72">
                                        <img
                                          src={msg.mediaUrl}
                                          alt="Uploaded media"
                                          className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                                          onClick={() => window.open(msg.mediaUrl!, "_blank")}
                                        />
                                      </div>
                                    )}

                                    {/* Media Video */}
                                    {msg.messageType === "video" && msg.mediaUrl && (
                                      <div className="rounded-xl overflow-hidden mb-1.5 max-h-72">
                                        <video
                                          src={msg.mediaUrl}
                                          controls
                                          className="w-full h-full object-cover rounded-xl"
                                        />
                                      </div>
                                    )}

                                    {/* Media File */}
                                    {msg.messageType === "file" && msg.mediaUrl && (
                                      <a
                                        href={msg.mediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium mb-1 ${
                                          isMine
                                            ? "bg-white/20 text-white hover:bg-white/30"
                                            : "bg-fb-btn hover:bg-fb-btn-hover text-foreground"
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <span className="truncate flex-1">
                                          {msg.fileName || "Download Attachment"}
                                        </span>
                                      </a>
                                    )}

                                    {/* Message Text */}
                                    {msg.text || msg.message ? (
                                      <p className="whitespace-pre-wrap leading-relaxed">
                                        {msg.text || msg.message}
                                      </p>
                                    ) : null}
                                  </div>
                                )}

                                {/* Reactions Summary Badge */}
                                {hasReactions && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (userReaction) {
                                        handleReaction(msg.id, userReaction.reaction);
                                      } else {
                                        setActiveReactionPickerMessageId(
                                          activeReactionPickerMessageId === msg.id ? null : msg.id
                                        );
                                      }
                                    }}
                                    title={msg.reactions
                                      ?.map((r) => `${r.userName}: ${r.reaction}`)
                                      .join(", ")}
                                    className={`absolute -bottom-2.5 ${
                                      isMine ? "right-2" : "left-2"
                                    } bg-card border border-border/80 shadow-2xs rounded-full px-1.5 py-0.5 flex items-center gap-1 hover:scale-105 transition cursor-pointer select-none z-10`}
                                  >
                                    <span className="text-xs leading-none">
                                      {Array.from(new Set(msg.reactions!.map((r) => r.reaction)))
                                        .slice(0, 3)
                                        .join("")}
                                    </span>
                                    {msg.reactions!.length > 1 && (
                                      <span className="text-[10px] font-semibold text-muted">
                                        {msg.reactions!.length}
                                      </span>
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Timestamp & Read Receipt */}
                              <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted">
                                <span>{formatMessageTime(msg.createdAt)}</span>
                                {isMine && isLatestMessage && !selectedConversation?.isGroup && (
                                  msg.isRead ? (
                                    <span className="flex items-center text-primary font-medium gap-0.5">
                                      <CheckCheck className="w-3 h-3 inline" />
                                      <span>Seen</span>
                                    </span>
                                  ) : (
                                    <Check className="w-3 h-3 text-muted inline" />
                                  )
                                )}
                              </div>
                            </div>

                            {/* Floating Reaction Trigger Button */}
                            <div
                              className={`relative ${
                                isMine ? "order-first" : "order-last"
                              } self-center pb-2`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveReactionPickerMessageId(
                                    activeReactionPickerMessageId === msg.id ? null : msg.id
                                  );
                                }}
                                title="React"
                                className="p-1 rounded-full text-muted hover:text-foreground hover:bg-fb-btn transition opacity-0 group-hover:opacity-100 cursor-pointer"
                              >
                                <Smile className="w-4 h-4" />
                              </button>

                              {/* Reaction Picker Popup */}
                              {activeReactionPickerMessageId === msg.id && (
                                <ReactionPicker
                                  position={isMine ? "top-right" : "top-left"}
                                  currentReaction={userReaction?.reaction}
                                  onSelect={(emoji) => handleReaction(msg.id, emoji)}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {/* Typing Indicator Bubble */}
                {isPartnerTyping && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center overflow-hidden shrink-0 border border-border">
                      {selectedUser?.avatar ? (
                        <img
                          src={selectedUser.avatar}
                          alt={selectedUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (selectedUser?.name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="bg-card border border-border px-3.5 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-muted/60 animate-typing-dot" />
                      <span className="w-2 h-2 rounded-full bg-muted/60 animate-typing-dot typing-delay-1" />
                      <span className="w-2 h-2 rounded-full bg-muted/60 animate-typing-dot typing-delay-2" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Bar: Message Request Action Banner vs Message Input */}
              {isSelectedUserRequest ? (
                <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-sm">
                  <div className="text-center sm:text-left min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Accept message request from {selectedUser?.name || "this user"}?
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      If you accept, they will know you&apos;ve seen their messages and can continue messaging you.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-center">
                    <button
                      type="button"
                      disabled={processingRequest}
                      onClick={handleDeclineRequest}
                      className="px-5 py-2 text-xs font-semibold rounded-full border border-border bg-fb-btn hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-foreground transition disabled:opacity-50 min-w-[90px] flex items-center justify-center cursor-pointer"
                    >
                      {processingRequest ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Decline"
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={processingRequest}
                      onClick={handleAcceptRequest}
                      className="px-5 py-2 text-xs font-semibold rounded-full bg-primary hover:bg-primary-hover text-white transition shadow-sm disabled:opacity-50 min-w-[90px] flex items-center justify-center cursor-pointer"
                    >
                      {processingRequest ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Accept"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Media File Attachment Preview Bar */}
                  {mediaFile && (
                    <div className="px-4 py-2 border-t border-border bg-card flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {mediaPreview ? (
                          <img
                            src={mediaPreview}
                            alt="Preview"
                            className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-fb-btn flex items-center justify-center text-muted shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {mediaFile.name}
                          </p>
                          <p className="text-[10px] text-muted">
                            {(mediaFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveMedia}
                        className="p-1 rounded-full hover:bg-fb-btn text-muted hover:text-foreground transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Bottom Message Input Bar */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0"
                  >
                    {/* File Attachment Input Button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach photo or file"
                      className="fb-btn-circle w-9 h-9 text-muted hover:text-primary transition shrink-0"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={text}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="flex-1 px-4 py-2 text-sm bg-fb-input hover:bg-fb-input-hover focus:bg-card text-foreground rounded-full border border-transparent focus:border-primary/40 focus:outline-none transition"
                    />

                    {/* Send Button or Thumbs Up */}
                    {text.trim() || mediaFile ? (
                      <button
                        type="submit"
                        disabled={sending || uploadingMedia}
                        className="w-9 h-9 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shrink-0 transition disabled:opacity-50"
                      >
                        {uploadingMedia || sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendLike}
                        title="Send a Like"
                        className="fb-btn-circle w-9 h-9 text-primary hover:bg-primary/10 transition shrink-0"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                </>
              )}
            </>
          ) : (
            /* Empty State (When no conversation is selected on desktop) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Your Messages</h2>
              <p className="text-xs text-muted max-w-sm">
                Send private messages, photos, and post shares directly to friends on Stalk.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={(newGroup) => {
          setConversations((prev) => [newGroup, ...prev]);
          setSelectedUserId(newGroup.id);
          setSelectedUser({
            id: newGroup.id,
            name: newGroup.friendName || "Group",
            avatar: newGroup.friendProfilePicture,
          });
        }}
        currentUserId={currentUserId}
        existingConversations={conversations}
      />
    </div>
  );
}

function MessagePageSkeleton() {
  return (
    <div className="h-[calc(100vh-4.25rem)] max-w-7xl mx-auto p-4 flex">
      <div className="w-full h-full bg-card rounded-2xl border border-border animate-pulse flex">
        <div className="w-80 border-r border-border p-4 space-y-4">
          <div className="h-6 bg-fb-btn rounded w-1/3" />
          <div className="h-10 bg-fb-btn rounded-full w-full" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-fb-btn" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-fb-btn rounded w-3/4" />
                  <div className="h-2 bg-fb-btn rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted" />
        </div>
      </div>
    </div>
  );
}

export default function MessagePage() {
  return (
    <Suspense fallback={<MessagePageSkeleton />}>
      <MessageContainer />
    </Suspense>
  );
}
