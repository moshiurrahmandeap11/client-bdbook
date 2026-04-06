// PostCard.jsx - Full Updated Code
"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  ChatBubbleLeftIcon,
  CheckIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
  LinkIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  ShareIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BsInstagram, BsVolumeUp } from "react-icons/bs";
import { FaAppStore, FaFacebook, FaTelegram, FaTwitter, FaWhatsapp } from "react-icons/fa";
import { FaSignalMessenger } from "react-icons/fa6";

// ── Share platforms ───────────────────────────────────────────────────────────
const SHARE_PLATFORMS = [
  { name: "WhatsApp",  icon: FaWhatsapp, color: "#25D366", url: (t, l) => `https://wa.me/?text=${encodeURIComponent(t + "\n\n" + l)}` },
  { name: "Twitter",   icon: FaTwitter, color: "#1DA1F2", url: (t, l) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(l)}` },
  { name: "Facebook",  icon: FaFacebook, color: "#1877F2", url: (t, l) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(l)}&quote=${encodeURIComponent(t)}` },
  { name: "Telegram",  icon: FaTelegram, color: "#26A5E4", url: (t, l) => `https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(t)}` },
  { name: "Messenger", icon: FaSignalMessenger, color: "#0084FF", url: (t, l) => `fb-messenger://share?link=${encodeURIComponent(l)}`, requiresMobile: true },
  { name: "Instagram", icon: BsInstagram, color: "#E4405F", url: (t, l) => `instagram://library?AssetPath=${encodeURIComponent(l)}`, requiresMobile: true },
];

// ── Liquid Glass style tokens ────────────────────────────────────────────────
const BDF = "blur(40px) saturate(180%)";
const BDF_LIGHT = "blur(20px) saturate(160%)";

const glassCard = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: BDF_LIGHT,
  WebkitBackdropFilter: BDF_LIGHT,
  border: "0.5px solid rgba(255,255,255,0.14)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
};

const glassInner = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: BDF_LIGHT,
  WebkitBackdropFilter: BDF_LIGHT,
  border: "0.5px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const glassDropdown = {
  background: "rgba(15,15,28,0.90)",
  backdropFilter: BDF,
  WebkitBackdropFilter: BDF,
  border: "0.5px solid rgba(255,255,255,0.18)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
};

const glassModal = {
  background: "rgba(10,10,22,0.92)",
  backdropFilter: BDF,
  WebkitBackdropFilter: BDF,
  border: "0.5px solid rgba(255,255,255,0.18)",
  boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
};

const glassVideoControls = {
  background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

// ── Avatar helper (memoized) ─────────────────────────────────────────────────
const Avatar = memo(({ src, name, size = 40 }) => (
  <div
    className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-transform duration-200"
    style={{
      width: size, height: size,
      background: src ? "transparent" : "linear-gradient(135deg,#7c3aed,#2563eb)",
      border: "1.5px solid rgba(255,255,255,0.2)",
    }}
  >
    {src ? (
      <Image 
        src={src} 
        alt={name || ""} 
        width={size} 
        height={size} 
        className="object-cover w-full h-full"
        loading="lazy"
      />
    ) : (
      <UserIcon style={{ width: size * 0.5, height: size * 0.5, color: "#fff" }} />
    )}
  </div>
));
Avatar.displayName = 'Avatar';

// ── 🔥 Facebook-Style Custom Video Player ────────────────────────────────────
const CustomVideoPlayer = memo(({ src, poster }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const handleSeek = useCallback((e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
    setProgress(percent * 100);
  }, [duration]);

  const handleMouseEnter = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
    }
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden bg-black group cursor-pointer"
      style={{ maxHeight: 500 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full object-cover"
        style={{ maxHeight: 500 }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        preload="metadata"
        playsInline
      />

      {/* Play/Pause overlay button */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <PlayIcon className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={glassVideoControls}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          className="h-1 bg-white/30 rounded-full cursor-pointer mb-3 group/progress"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-500 rounded-full relative transition-all duration-100"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg" />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5 text-white" />
              ) : (
                <PlayIcon className="h-5 w-5 text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <BsVolumeUp className={`h-5 w-5 text-white ${isMuted ? 'opacity-50' : ''}`} />
            </button>

            <span className="text-xs text-white/80 font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isFullscreen ? (
                <>
                  <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                </>
              ) : (
                <>
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
CustomVideoPlayer.displayName = 'CustomVideoPlayer';

// ── SharedPostPreview ────────────────────────────────────────────────────────
const SharedPostPreview = memo(({ originalPost, postUrl, onClick }) => {
  if (!originalPost) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left mt-3 rounded-xl overflow-hidden transition-all duration-200 hover:opacity-80"
        style={{ ...glassInner, borderRadius: 12 }}
      >
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.25)" }}>
            <LinkIcon className="h-5 w-5" style={{ color: "#a78bfa" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>View Original Post</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{postUrl}</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left mt-3 rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.99]"
      style={{ ...glassInner, borderRadius: 12 }}
    >
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
        <Avatar src={originalPost.userProfilePicture} name={originalPost.userName} size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
            {originalPost.userName || "Unknown User"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Original post</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(124,58,237,0.25)", color: "#c4b5fd", border: "0.5px solid rgba(124,58,237,0.4)" }}>
          Original
        </span>
      </div>
      {originalPost.description && (
        <p className="text-sm px-3 py-2 line-clamp-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
          {originalPost.description}
        </p>
      )}
      {originalPost.media?.url && (
        <div className="w-full overflow-hidden" style={{ maxHeight: 280 }}>
          {originalPost.media.resourceType === "video" ? (
            <video src={originalPost.media.url} className="w-full object-cover" style={{ maxHeight: 280 }} preload="metadata" onClick={(e) => e.stopPropagation()} controls />
          ) : (
            <div className="relative w-full" style={{ minHeight: 140 }}>
              <Image src={originalPost.media.url} alt="Original post media" width={600} height={300} className="w-full object-cover" style={{ maxHeight: 280 }} loading="lazy" />
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}>
        <LinkIcon className="h-3 w-3 flex-shrink-0" />
        <span className="text-[11px]">Tap to view full post</span>
      </div>
    </button>
  );
});
SharedPostPreview.displayName = 'SharedPostPreview';

// ── ShareModal ───────────────────────────────────────────────────────────────
const ShareModal = ({ post, user, sharePreview, shareToFeedMutation, shareToMessageMutation, onClose }) => {
  const [shareTab, setShareTab] = useState("feed");
  const [searchFriend, setSearchFriend] = useState("");
  const [copied, setCopied] = useState(false);
  const { isAuthenticated } = useAuth();
  const modalRef = useRef(null);

  const { data: topFriends, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["top-friends"],
    queryFn: async () => {
      const res = await axiosInstance.get("/users/conversations");
      if (res.data.success) return res.data.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sharePreview.postUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Failed to copy link"); }
  };

  const shareToExternal = (platform) => {
    const { postUrl, text } = sharePreview;
    const shareText = `${text}\n\nShared by ${user?.fullName}`;
    const shareUrl = platform.url(shareText, postUrl);
    if (platform.requiresMobile && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = shareUrl;
    } else if (!platform.requiresMobile) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    } else {
      toast.error(`${platform.name} sharing is only available on mobile`);
    }
  };

  const TABS = [
    { id: "feed", label: "Feed", icon: "" },
    { id: "message", label: "Message", icon: "" },
    { id: "external", label: "Apps", icon: FaAppStore },
  ];

  const FriendRow = memo(({ id, picture, name, onSend }) => (
    <button
      onClick={() => onSend(id)}
      disabled={shareToMessageMutation.isPending}
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div ref={modalRef} className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ ...glassModal, maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 z-10" style={{ background: "rgba(10,10,22,0.92)", borderBottom: "0.5px solid rgba(255,255,255,0.12)" }}>
          <h2 className="text-base font-bold text-white">Share Post</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition" style={{ background: "rgba(255,255,255,0.1)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}>
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="px-4 py-3" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2.5 p-3 rounded-xl" style={glassInner}>
            <Avatar src={post.userProfilePicture} name={post.userName} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{post.userName}</p>
              {post.description && <p className="text-xs line-clamp-1" style={{ color: "rgba(255,255,255,0.5)" }}>{post.description}</p>}
            </div>
            {post.media?.url && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                {post.media.resourceType === "video" ? (
                  <video src={post.media.url} className="w-full h-full object-cover" />
                ) : (
                  <Image src={post.media.url} alt="" width={48} height={48} className="object-cover w-full h-full" loading="lazy" />
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.1)" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setShareTab(tab.id)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all duration-150" style={{ color: shareTab === tab.id ? "#c4b5fd" : "rgba(255,255,255,0.5)", borderBottom: shareTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent" }}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="overflow-y-auto p-4" style={{ maxHeight: "50vh" }}>
          {shareTab === "feed" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={glassInner}>
                <Avatar src={user?.profilePicture?.url} name={user?.fullName} size={40} />
                <div><p className="text-sm font-semibold text-white">{user?.fullName}</p><p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Share to your timeline</p></div>
              </div>
              <button onClick={() => shareToFeedMutation.mutate()} disabled={shareToFeedMutation.isPending} className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50" style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
                {shareToFeedMutation.isPending ? "Sharing…" : "Share to Feed"}
              </button>
            </div>
          )}
          {shareTab === "message" && (
            <div className="space-y-3">
              <input type="text" value={searchFriend} onChange={(e) => setSearchFriend(e.target.value)} placeholder="Search friends…" className="w-full rounded-xl py-2.5 px-4 text-sm text-white outline-none" style={{ ...glassInner, borderRadius: 12, color: "#fff" }} />
              {(isLoadingFriends || isSearchingFriends) && (
                <div className="flex justify-center py-6">
                  <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#7c3aed" }} />
                </div>
              )}
              {!searchFriend && topFriends?.length > 0 && (
                <div>
                  <p className="text-[11px] mb-2 px-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>RECENT CHATS</p>
                  {topFriends.map((f) => <FriendRow key={f.friendId} id={f.friendId} picture={f.friendProfilePicture} name={f.friendName} onSend={shareToMessageMutation.mutate} />)}
                </div>
              )}
              {searchFriend && searchedFriends?.length > 0 && (
                <div>
                  <p className="text-[11px] mb-2 px-1" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>RESULTS</p>
                  {searchedFriends.map((f) => <FriendRow key={f._id} id={f._id} picture={f.profilePicture?.url} name={f.fullName} onSend={shareToMessageMutation.mutate} />)}
                </div>
              )}
              {searchFriend && !isSearchingFriends && searchedFriends?.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>No friends found</p>
              )}
            </div>
          )}
          {shareTab === "external" && (
            <div className="space-y-3">
              <button onClick={copyLink} className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150" style={{ ...glassInner, borderRadius: 12 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)" }}>
                  {copied ? <CheckIcon className="h-5 w-5" style={{ color: "#4ade80" }} /> : <LinkIcon className="h-5 w-5 text-white" />}
                </div>
                <div className="flex-1 text-left"><p className="text-sm font-medium text-white">{copied ? "Copied!" : "Copy Link"}</p><p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Copy post link to clipboard</p></div>
              </button>
              <div className="grid grid-cols-2 gap-2">
                {SHARE_PLATFORMS.map((platform) => (
                  <button key={platform.name} onClick={() => shareToExternal(platform)} className="flex items-center gap-2.5 p-3 rounded-xl transition-all duration-150" style={{ ...glassInner, borderRadius: 12 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                    <span style={{ fontSize: 20 }}>{platform.icon}</span><p className="text-sm font-medium text-white">{platform.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN POST CARD COMPONENT ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const PostCard = memo(({ post, onPostUpdate, hideMenu = false }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isLiked, setIsLiked] = useState(() => post.likes?.includes(user?._id) || post.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef(null);
  const isOwner = post.userId === user?._id;
  const commentCount = post.commentsCount || 0;
  const shareCount = post.sharesCount || 0;

  const isSharedPost = !!(post.isShare || post.originalPost || post.sharedPost || post.sharedPostId || post.type === "share");
  const originalPost = useMemo(() => post.originalPost || post.sharedPost || null, [post]);

  const sharePreview = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const postUrl = `${origin}/post/details/${originalPost?._id || post._id}`;
    const text = post.description || originalPost?.description || "Shared a post";
    return { postUrl, text };
  }, [post, originalPost]);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getTimeAgo = useCallback((date) => {
    if (!date) return "recently";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [unit, s] of Object.entries(intervals)) {
      const n = Math.floor(seconds / s);
      if (n >= 1) return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
    }
    return "just now";
  }, []);

  const checkAuth = useCallback(() => {
    if (!isAuthenticated) { toast.error("Please login to continue"); router.push("/auth/login"); return false; }
    return true;
  }, [isAuthenticated, router]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => { const res = await axiosInstance.post(`/posts/${post._id}/like`); return res.data; },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      queryClient.setQueryData(["posts"], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.map((p) => p._id === post._id ? { ...p, likes: p.likes?.includes(user?._id) ? p.likes.filter((id) => id !== user?._id) : [...(p.likes || []), user?._id], likesCount: p.likes?.includes(user?._id) ? p.likesCount - 1 : p.likesCount + 1 } : p) })) };
      });
      setIsLiked((prev) => !prev); setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
      return { previousPosts };
    },
    onError: (err, vars, context) => {
      if (context?.previousPosts) queryClient.setQueryData(["posts"], context.previousPosts);
      setIsLiked((prev) => !prev); setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      toast.error("Failed to like post");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: 'inactive' }),
  });

  // Share mutations
  const shareToFeedMutation = useMutation({
    mutationFn: async () => {
      const postId = String(post._id)?.trim();
      if (process.env.NODE_ENV === 'development') console.log('Sharing post with ID:', postId, 'Type:', typeof postId);
      const res = await axiosInstance.post(`/posts/${postId}/share`);
      return res.data;
    },
    onSuccess: () => { toast.success("Post shared to your feed!"); queryClient.invalidateQueries({ queryKey: ["posts"] }); setShowShareModal(false); onPostUpdate?.(); },
    onError: (err) => { console.error('Share error:', err.response?.data); toast.error(err.response?.data?.message || "Failed to share post"); },
  });

  const shareToMessageMutation = useMutation({
    mutationFn: async (friendId) => {
      const postId = String(post._id)?.trim();
      const res = await axiosInstance.post(`/users/send-message/${friendId}`, {
        message: JSON.stringify({ type: "post_share", postId, postUrl: sharePreview.postUrl, postText: post.description, postAuthor: post.userName, postAuthorProfilePic: post.userProfilePicture, hasMedia: !!post.media?.url, mediaType: post.media?.resourceType, mediaUrl: post.media?.url, sharedBy: user?.fullName, sharedByProfilePic: user?.profilePicture?.url }),
        messageType: "share",
      });
      return res.data;
    },
    onSuccess: () => { toast.success("Post shared via message!"); setShowShareModal(false); },
    onError: (err) => { console.error('Share message error:', err.response?.data); toast.error("Failed to share via message"); },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (description) => { const res = await axiosInstance.patch(`/posts/${post._id}`, { description }); return res.data; },
    onSuccess: () => { toast.success("Post updated!"); setShowEditModal(false); queryClient.invalidateQueries({ queryKey: ["posts"] }); onPostUpdate?.(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update post"),
  });

  // ⚡ INSTANT DELETE mutation (no delay, optimistic UI)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.delete(`/posts/${post._id}`);
      return res.data;
    },
    onMutate: async () => {
      // ⚡ Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      
      // ⚡ INSTANTLY remove from cache (no delay!)
      queryClient.setQueryData(["posts"], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.filter((p) => p._id !== post._id) })) };
      });
      
      // ⚡ Show instant toast (no loading state)
      toast.success("Post deleted", { duration: 2500, style: { background: "rgba(30,30,46,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" } });
      
      return { previousPosts };
    },
    onSuccess: () => {
      // Background refetch for consistency (doesn't affect UX)
      queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "inactive" });
      onPostUpdate?.();
    },
    onError: (err, vars, context) => {
      // Rollback if error
      if (context?.previousPosts) queryClient.setQueryData(["posts"], context.previousPosts);
      toast.error("Failed to delete post");
    },
  });

  const handleLike = useCallback(() => { if (!checkAuth()) return; likeMutation.mutate(); }, [checkAuth, likeMutation]);
  const goToPostDetails = useCallback(() => { router.push(`/post/details/${post._id}`); }, [router, post._id]);
  const handleComment = useCallback(() => { if (!checkAuth()) return; goToPostDetails(); }, [checkAuth, goToPostDetails]);
  const handleSharePost = useCallback(() => { if (!checkAuth()) return; setShowShareModal(true); setShowMenu(false); }, [checkAuth]);
  
  // ⚡ INSTANT DELETE handler (no confirm, no delay)
  const handleDeletePost = useCallback(() => {
    setIsDeleting(true); // Triggers exit animation
    deleteMutation.mutate(); // Fires immediately
  }, [deleteMutation]);

  const handleEditPost = useCallback(() => {
    if (!editDescription.trim()) { toast.error("Please add a description"); return; }
    editMutation.mutate(editDescription);
  }, [editDescription, editMutation]);

  return (
    <>
      <div
        className={`rounded-2xl overflow-hidden transition-all duration-200 will-change-transform ${isDeleting ? 'animate-exit' : ''}`}
        style={{ ...glassCard, borderRadius: 16, opacity: isDeleting ? 0.5 : 1, transform: isDeleting ? 'scale(0.98)' : 'scale(1)' }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <button onClick={() => router.push(`/profile/${post.userId}`)} className="flex-shrink-0">
                <Avatar src={post.userProfilePicture} name={post.userName} size={44} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => router.push(`/profile/${post.userId}`)} className="font-semibold text-sm leading-tight transition" style={{ color: "rgba(255,255,255,0.95)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#c4b5fd")} onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.95)")}>
                    {post.userName}
                  </button>
                  {isSharedPost && <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>shared a post</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{getTimeAgo(post.createdAt)}</p>
              </div>
            </div>
            {!hideMenu && (isOwner || user?.role === "admin") && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu((p) => !p)} className="w-8 h-8 rounded-full flex items-center justify-center transition" style={{ color: "rgba(255,255,255,0.55)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-1.5 w-44 rounded-2xl overflow-hidden z-50" style={{ ...glassDropdown, animation: "lgFadeDown 0.15s ease-out" }}>
                    {[
                      { label: "Edit Post", Icon: PencilIcon, onClick: () => { setShowEditModal(true); setShowMenu(false); }, color: "rgba(255,255,255,0.75)" },
                      { label: "Share", Icon: ShareIcon, onClick: handleSharePost, color: "rgba(255,255,255,0.75)" },
                      { label: "Delete Post", Icon: TrashIcon, onClick: handleDeletePost, color: "#f87171", hover: "rgba(239,68,68,0.12)" },
                    ].map(({ label, Icon, onClick, color, hover }) => (
                      <button key={label} onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150 text-left" style={{ color }} onMouseEnter={(e) => { e.currentTarget.style.background = hover || "rgba(255,255,255,0.08)"; if (!hover) e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = color; }}>
                        <Icon className="h-4 w-4 flex-shrink-0" />{label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <p className="mt-3 text-sm leading-relaxed break-words cursor-pointer" style={{ color: "rgba(255,255,255,0.82)" }} onClick={goToPostDetails}>
              {post.description}
            </p>
          )}

          {/* Media or Shared Post Preview */}
          {isSharedPost ? (
            <SharedPostPreview originalPost={originalPost} postUrl={sharePreview.postUrl} onClick={() => { if (originalPost?._id) router.push(`/post/details/${originalPost._id}`); else router.push(sharePreview.postUrl); }} />
          ) : (
            post.media?.url && (
              <div className="rounded-xl overflow-hidden -mx-4 mt-3 cursor-pointer" onClick={goToPostDetails}>
                {post.media.resourceType === "video" ? (
                  // 🔥 Facebook-Style Custom Video Player
                  <CustomVideoPlayer src={post.media.url} poster={post.media.thumbnailUrl} />
                ) : (
                  <Image src={post.media.url} alt="Post media" width={800} height={600} loading="lazy" className="w-full object-cover" style={{ maxHeight: 500 }} onClick={(e) => { e.stopPropagation(); goToPostDetails(); }} />
                )}
              </div>
            )
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-around mt-4 pt-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
            {[
              { icon: isLiked ? <HeartSolidIcon className="h-5 w-5" style={{ color: "#ef4444" }} /> : <HeartIcon className="h-5 w-5" />, count: likeCount, onClick: handleLike, hoverColor: "#f87171", disabled: likeMutation.isPending },
              { icon: <ChatBubbleLeftIcon className="h-5 w-5" />, count: commentCount, onClick: handleComment, hoverColor: "#c4b5fd" },
              { icon: <ShareIcon className="h-5 w-5" />, count: shareCount, onClick: handleSharePost, hoverColor: "#4ade80" },
            ].map(({ icon, count, onClick, hoverColor, disabled }, i) => (
              <button key={i} onClick={onClick} disabled={disabled} className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-150 disabled:opacity-50" style={{ color: "rgba(255,255,255,0.5)" }} onMouseEnter={(e) => { e.currentTarget.style.color = hoverColor; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent"; }}>
                {icon}<span className="text-sm font-medium">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && <ShareModal post={post} user={user} sharePreview={sharePreview} shareToFeedMutation={shareToFeedMutation} shareToMessageMutation={shareToMessageMutation} onClose={() => setShowShareModal(false)} />}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden" style={glassModal}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.12)" }}>
              <h2 className="text-base font-bold text-white">Edit Post</h2>
              <button onClick={() => { setShowEditModal(false); setEditDescription(post.description || ""); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-5">
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What's on your mind?" rows={4} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none" style={{ ...glassInner, borderRadius: 12 }} />
            </div>
            <div className="px-5 pb-5">
              <button onClick={handleEditPost} disabled={editMutation.isPending} className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50" style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
                {editMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes lgFadeDown { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes exit { 
          0% { opacity: 1; transform: scale(1); } 
          50% { opacity: 0.5; transform: scale(0.98); } 
          100% { opacity: 0; transform: scale(0.95); height: 0; margin: 0; padding: 0; } 
        }
        .animate-exit { animation: exit 0.25s ease-out forwards; }
        textarea::placeholder { color: rgba(255,255,255,0.35) !important; }
        input::placeholder { color: rgba(255,255,255,0.35) !important; }
        .will-change-transform { will-change: transform; }
        /* Hide default video controls */
        video::-webkit-media-controls { display: none !important; }
        video::-webkit-media-controls-enclosure { display: none !important; }
        video::-webkit-media-controls-panel { display: none !important; }
        /* Smooth scrollbar */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; transition: background 0.2s; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </>
  );
});
PostCard.displayName = 'PostCard';

export default PostCard;