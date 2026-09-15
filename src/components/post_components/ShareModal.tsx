"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { CheckIcon, LinkIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import Image from "next/image";
import React, { memo, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BsInstagram } from "react-icons/bs";
import { FaAppStore, FaFacebook, FaTelegram, FaTwitter, FaWhatsapp } from "react-icons/fa";
import { FaSignalMessenger } from "react-icons/fa6";
import Avatar from "./Avatar";
import { IPost } from "@/types/post.types";
import { IUser } from "@/types/user.types";

export interface SharePlatform {
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  url: (text: string, link: string) => string;
  requiresMobile?: boolean;
}

export const SHARE_PLATFORMS: SharePlatform[] = [
  { name: "WhatsApp",  icon: FaWhatsapp, color: "#25D366", url: (t, l) => `https://wa.me/?text=${encodeURIComponent(t + "\n\n" + l)}` },
  { name: "Twitter",   icon: FaTwitter, color: "#1DA1F2", url: (t, l) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(l)}` },
  { name: "Facebook",  icon: FaFacebook, color: "#1877F2", url: (t, l) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(l)}&quote=${encodeURIComponent(t)}` },
  { name: "Telegram",  icon: FaTelegram, color: "#26A5E4", url: (t, l) => `https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(t)}` },
  { name: "Messenger", icon: FaSignalMessenger, color: "#0084FF", url: (t, l) => `fb-messenger://share?link=${encodeURIComponent(l)}`, requiresMobile: true },
  { name: "Instagram", icon: BsInstagram, color: "#E4405F", url: (t, l) => `instagram://library?AssetPath=${encodeURIComponent(l)}`, requiresMobile: true },
];

const BDF = "blur(40px) saturate(180%)";
const glassModal: React.CSSProperties = {
  background: "rgba(10,10,22,0.92)",
  backdropFilter: BDF,
  WebkitBackdropFilter: BDF,
  border: "0.5px solid rgba(255,255,255,0.18)",
  boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
};

const glassInner: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "0.5px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

interface FriendRowProps {
  id: string;
  picture?: string | null;
  name: string;
  onSend: (id: string) => void;
  disabled?: boolean;
}

const FriendRow = memo(({ id, picture, name, onSend, disabled }: FriendRowProps) => (
  <button
    onClick={() => onSend(id)}
    disabled={disabled}
    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 text-left"
    style={{ color: "rgba(255,255,255,0.85)" }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    <Avatar src={picture} name={name} size={40} />
    <p className="flex-1 text-sm font-medium">{name}</p>
    <Send className="h-4 w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
  </button>
));
FriendRow.displayName = 'FriendRow';

interface ShareModalProps {
  post: IPost | any;
  user?: IUser | any;
  onClose: () => void;
  onShareToFeed?: () => void;
  onShareToMessage?: (friendId: string) => void;
  onCopyLink?: (url: string) => void;
  sharePreview?: { postUrl: string; text: string };
  isSharingToFeed?: boolean;
  isSharingToMessage?: boolean;
}

export const ShareModal = ({
  post,
  user,
  onClose,
  onShareToFeed,
  onShareToMessage,
  onCopyLink,
  sharePreview,
  isSharingToFeed = false,
  isSharingToMessage = false,
}: ShareModalProps) => {
  const [shareTab, setShareTab] = useState<"feed" | "message" | "external">("feed");
  const [searchFriend, setSearchFriend] = useState("");
  const [copied, setCopied] = useState(false);
  const { isAuthenticated } = useAuth();
  const modalRef = useRef<HTMLDivElement | null>(null);

  const preview = useMemo(() => {
    if (sharePreview) return sharePreview;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const postUrl = `${origin}/post/details/${post._id}`;
    const text = post.description || "Check out this post";
    return { postUrl, text };
  }, [sharePreview, post]);

  const { data: topFriends, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["top-friends"],
    queryFn: async () => {
      const res = await axiosInstance.get("/users/conversations");
      if (res.data.success) {
        return res.data.data
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 6);
      }
      return [];
    },
    enabled: isAuthenticated && shareTab === "message",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: searchedFriends, isLoading: isSearchingFriends } = useQuery({
    queryKey: ["search-friends", searchFriend],
    queryFn: async () => {
      if (!searchFriend.trim()) return [];
      const res = await axiosInstance.get(`/users/search/${encodeURIComponent(searchFriend)}`);
      return res.data.success ? res.data.data.slice(0, 6) : [];
    },
    enabled: isAuthenticated && searchFriend.trim().length >= 2 && shareTab === "message",
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(preview.postUrl);
      setCopied(true);
      toast.success("Link copied!");
      onCopyLink?.(preview.postUrl);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareExternal = (platform: SharePlatform) => {
    const shareText = `${preview.text}\n\nShared by ${user?.fullName || "User"}`;
    const shareUrl = platform.url(shareText, preview.postUrl);
    
    if (platform.requiresMobile && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = shareUrl;
    } else if (!platform.requiresMobile) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    } else {
      toast.error(`${platform.name} sharing is only available on mobile`);
    }
  };

  const handleShareToFeed = () => {
    if (onShareToFeed) onShareToFeed();
  };

  const handleShareToMessage = (friendId: string) => {
    if (onShareToMessage) onShareToMessage(friendId);
  };

  const TABS = [
    { id: "feed" as const, label: "Feed", icon: null },
    { id: "message" as const, label: "Message", icon: null },
    { id: "external" as const, label: "Apps", icon: FaAppStore },
  ];

  const postAuthorName = post.userName || post.user?.fullName || "User";
  const postAuthorPic = post.userProfilePicture || post.user?.profilePicture?.url;
  const mediaUrl = post.mediaUrl || post.media?.url;
  const mediaType = post.mediaType || post.media?.resourceType || "image";

  return (
    <div
      className="fixed inset-0 z-50 bottom-18 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ ...glassModal, maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
          style={{
            background: "rgba(10,10,22,0.92)",
            borderBottom: "0.5px solid rgba(255,255,255,0.12)",
          }}
        >
          <h2 className="text-base font-bold text-white">Share Post</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition"
            style={{ background: "rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          >
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Mini post preview */}
        <div className="px-4 py-3" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2.5 p-3 rounded-xl" style={glassInner}>
            <Avatar src={postAuthorPic} name={postAuthorName} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{postAuthorName}</p>
              {post.description && (
                <p className="text-xs line-clamp-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {post.description}
                </p>
              )}
            </div>
            {mediaUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                {mediaType === "video" ? (
                  <video src={mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <Image src={mediaUrl} alt="" width={48} height={48} className="object-cover w-full h-full" loading="lazy" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.1)" }}>
          {TABS.map((tab) => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setShareTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all duration-150"
                style={{
                  color: shareTab === tab.id ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                  borderBottom: shareTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
                }}
              >
                {IconComp && <IconComp className="h-4 w-4" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: "50vh" }}>
          {/* Feed Tab */}
          {shareTab === "feed" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={glassInner}>
                <Avatar src={typeof user?.profilePicture === "object" ? user?.profilePicture?.url : user?.profilePicture || user?.avatar} name={user?.fullName || user?.name} size={40} />
                <div>
                  <p className="text-sm font-semibold text-white">{user?.fullName || "You"}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Share to your timeline</p>
                </div>
              </div>
              <button
                onClick={handleShareToFeed}
                disabled={isSharingToFeed}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                }}
              >
                {isSharingToFeed ? "Sharing…" : "Share to Feed"}
              </button>
            </div>
          )}

          {/* Message Tab */}
          {shareTab === "message" && (
            <div className="space-y-3">
              <input
                type="text"
                value={searchFriend}
                onChange={(e) => setSearchFriend(e.target.value)}
                placeholder="Search friends…"
                className="w-full rounded-xl py-2.5 px-4 text-sm text-white outline-none"
                style={{ ...glassInner, borderRadius: 12, color: "#fff" }}
              />

              {(isLoadingFriends || isSearchingFriends) && (
                <div className="flex justify-center py-6">
                  <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#7c3aed" }} />
                </div>
              )}

              {!searchFriend && topFriends && topFriends.length > 0 && (
                <div>
                  <p className="text-[11px] mb-2 px-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>RECENT CHATS</p>
                  {topFriends.map((f: any) => (
                    <FriendRow
                      key={f.friendId}
                      id={f.friendId}
                      picture={f.friendProfilePicture}
                      name={f.friendName}
                      onSend={handleShareToMessage}
                      disabled={isSharingToMessage}
                    />
                  ))}
                </div>
              )}

              {searchFriend && searchedFriends && searchedFriends.length > 0 && (
                <div>
                  <p className="text-[11px] mb-2 px-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>RESULTS</p>
                  {searchedFriends.map((f: any) => (
                    <FriendRow
                      key={f._id}
                      id={f._id}
                      picture={f.profilePicture?.url || f.profilePicture}
                      name={f.fullName}
                      onSend={handleShareToMessage}
                      disabled={isSharingToMessage}
                    />
                  ))}
                </div>
              )}

              {searchFriend && !isSearchingFriends && (!searchedFriends || searchedFriends.length === 0) && (
                <p className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>No friends found</p>
              )}
            </div>
          )}

          {/* External Apps Tab */}
          {shareTab === "external" && (
            <div className="space-y-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150"
                style={{ ...glassInner, borderRadius: 12 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)" }}>
                  {copied ? <CheckIcon className="h-5 w-5" style={{ color: "#4ade80" }} /> : <LinkIcon className="h-5 w-5 text-white" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">{copied ? "Copied!" : "Copy Link"}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Copy post link to clipboard</p>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {SHARE_PLATFORMS.map((platform) => {
                  const PlatformIcon = platform.icon;
                  return (
                    <button
                      key={platform.name}
                      onClick={() => handleShareExternal(platform)}
                      className="flex items-center gap-2.5 p-3 rounded-xl transition-all duration-150"
                      style={{ ...glassInner, borderRadius: 12 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    >
                      <span style={{ fontSize: 20, color: platform.color }}>
                        <PlatformIcon />
                      </span>
                      <p className="text-sm font-medium text-white">{platform.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ShareModal.displayName = 'ShareModal';
export default ShareModal;

