"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { CheckIcon, LinkIcon } from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Search } from "lucide-react";
import Image from "next/image";
import React, { memo, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { postService } from "@/services/post.service";
import { BsInstagram } from "react-icons/bs";
import { FaAppStore, FaFacebook, FaTelegram, FaTwitter, FaWhatsapp } from "react-icons/fa";
import { FaSignalMessenger } from "react-icons/fa6";
import Avatar from "./Avatar";
import { IPost } from "@/types/post.types";
import { IUser } from "@/types/user.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

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
    className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150 text-left hover:bg-slate-100 text-slate-800 disabled:opacity-50 cursor-pointer"
  >
    <Avatar src={picture} name={name} size={38} />
    <p className="flex-1 text-sm font-normal text-slate-800 truncate">{name}</p>
    <Send className="h-4 w-4 flex-shrink-0 text-slate-400 hover:text-[#4E4AFC] transition-colors" />
  </button>
));
FriendRow.displayName = "FriendRow";

interface ShareModalProps {
  post: IPost | any;
  user?: IUser | any;
  onClose: () => void;
  onShareToFeed?: (description?: string) => void;
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
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [internalSharingFeed, setInternalSharingFeed] = useState(false);
  const [internalSharingMessage, setInternalSharingMessage] = useState(false);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const preview = useMemo(() => {
    if (sharePreview) return sharePreview;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const postUrl = `${origin}/post/details/${post._id || post.id}`;
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

  const handleShareToFeed = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to share");
      return;
    }
    onClose();
    if (onShareToFeed) {
      onShareToFeed(caption);
      return;
    }
    const pId = post?._id || post?.id;
    if (!pId) return;
    toast.success("Post shared to your feed!");
    try {
      await postService.sharePost(pId, { description: caption });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to share post");
    }
  };

  const handleShareToMessage = async (friendId: string) => {
    if (!isAuthenticated) {
      toast.error("Please login to send message");
      return;
    }
    if (onShareToMessage) {
      onShareToMessage(friendId);
      return;
    }
    const pId = post?._id || post?.id;
    if (!pId) return;
    try {
      setInternalSharingMessage(true);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const postUrl = `${origin}/post/details/${pId}`;
      await axiosInstance.post(`/messages/send-message/${friendId}`, {
        message: JSON.stringify({
          type: "post_share",
          postId: pId,
          postUrl,
          postText: post.description || "Check out this post",
          postAuthor: post.userName || post.user?.fullName,
          postAuthorProfilePic: post.userProfilePicture || post.user?.profilePicture?.url,
          hasMedia: !!(post.mediaUrl || post.media?.url),
          mediaType: post.mediaType || post.media?.resourceType,
          mediaUrl: post.mediaUrl || post.media?.url,
          sharedBy: user?.fullName || user?.name,
          sharedByProfilePic:
            typeof user?.profilePicture === "object"
              ? user?.profilePicture?.url
              : user?.profilePicture || user?.avatar,
        }),
        messageType: "share",
      });
      toast.success("Post shared via message!");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to share via message");
    } finally {
      setInternalSharingMessage(false);
    }
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Share Post"
      maxWidth="md"
      className="p-0 overflow-hidden"
    >
      <div className="-m-5">
        {/* Post Preview Snippet */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80">
            <Avatar src={postAuthorPic} name={postAuthorName} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-normal text-slate-900 truncate">{postAuthorName}</p>
              {post.description && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {post.description}
                </p>
              )}
            </div>
            {mediaUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 bg-slate-100">
                {mediaType === "video" ? (
                  <video src={mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <Image src={mediaUrl} alt="" width={48} height={48} className="object-cover w-full h-full" loading="lazy" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white">
          {TABS.map((tab) => {
            const IconComp = tab.icon;
            const isSelected = shareTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setShareTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-normal transition-all duration-150 border-b-2 cursor-pointer",
                  isSelected
                    ? "text-[#4E4AFC] border-[#4E4AFC] font-normal"
                    : "text-slate-500 border-transparent hover:text-slate-800"
                )}
              >
                {IconComp && <IconComp className="h-4 w-4" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-4">
          {/* Feed Tab */}
          {shareTab === "feed" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Avatar
                  src={typeof user?.profilePicture === "object" ? user?.profilePicture?.url : user?.profilePicture || user?.avatar}
                  name={user?.fullName || user?.name}
                  size={42}
                />
                <div>
                  <p className="text-sm font-normal text-slate-900">{user?.fullName || "You"}</p>
                  <p className="text-xs text-slate-500">Share immediately to your public timeline</p>
                </div>
              </div>

              {/* Optional Caption */}
              <div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Say something about this post... (optional)"
                  rows={2}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-[#4E4AFC] rounded-xl focus:outline-none transition-colors resize-none placeholder:text-slate-400 font-normal"
                />
              </div>

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handleShareToFeed}
                loading={isSharingToFeed || internalSharingFeed}
                disabled={isSharingToFeed || internalSharingFeed}
              >
                Share to Feed
              </Button>
            </div>
          )}

          {/* Message Tab */}
          {shareTab === "message" && (
            <div className="space-y-3">
              <Input
                type="text"
                value={searchFriend}
                onChange={(e) => setSearchFriend(e.target.value)}
                placeholder="Search friends..."
                leftIcon={<Search className="h-4 w-4" />}
              />

              {(isLoadingFriends || isSearchingFriends) && (
                <div className="flex justify-center py-6">
                  <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-[#4E4AFC] animate-spin" />
                </div>
              )}

              {!searchFriend && topFriends && topFriends.length > 0 && (
                <div>
                  <p className="text-[11px] font-normal text-slate-400 uppercase tracking-wider mb-2 px-1">Recent Chats</p>
                  <div className="space-y-1">
                    {topFriends.map((f: any) => (
                      <FriendRow
                        key={f.friendId}
                        id={f.friendId}
                        picture={f.friendProfilePicture}
                        name={f.friendName}
                        onSend={handleShareToMessage}
                        disabled={isSharingToMessage || internalSharingMessage}
                      />
                    ))}
                  </div>
                </div>
              )}

              {searchFriend && searchedFriends && searchedFriends.length > 0 && (
                <div>
                  <p className="text-[11px] font-normal text-slate-400 uppercase tracking-wider mb-2 px-1">Search Results</p>
                  <div className="space-y-1">
                    {searchedFriends.map((f: any) => (
                      <FriendRow
                        key={f._id}
                        id={f._id}
                        picture={f.profilePicture?.url || f.profilePicture}
                        name={f.fullName}
                        onSend={handleShareToMessage}
                        disabled={isSharingToMessage || internalSharingMessage}
                      />
                    ))}
                  </div>
                </div>
              )}

              {searchFriend && !isSearchingFriends && (!searchedFriends || searchedFriends.length === 0) && (
                <p className="text-center py-8 text-sm text-slate-400">No friends found</p>
              )}
            </div>
          )}

          {/* External Apps Tab */}
          {shareTab === "external" && (
            <div className="space-y-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    copied ? "bg-green-100 text-green-600" : "bg-[#EEEDFE] text-[#4E4AFC]"
                  )}
                >
                  {copied ? <CheckIcon className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-normal text-slate-900">{copied ? "Copied to clipboard!" : "Copy Link"}</p>
                  <p className="text-xs text-slate-500">Share via custom link</p>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {SHARE_PLATFORMS.map((platform) => {
                  const PlatformIcon = platform.icon;
                  return (
                    <button
                      key={platform.name}
                      onClick={() => handleShareExternal(platform)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 transition-all text-left cursor-pointer"
                    >
                      <span style={{ fontSize: 22, color: platform.color }}>
                        <PlatformIcon />
                      </span>
                      <p className="text-sm font-normal text-slate-800">{platform.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

ShareModal.displayName = "ShareModal";
export default ShareModal;
