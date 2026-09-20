"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { postService } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import {
  ArrowPathIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
  PaperAirplaneIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  StarIcon,
  TrashIcon,
  UserIcon,
  VideoCameraIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ShareModal from "./ShareModal";

interface VideoActionProps {
  icon: React.ReactNode;
  count?: number;
  onClick?: () => void;
  onLongPress?: () => void;
}

const VideoAction = ({ icon, count, onClick, onLongPress }: VideoActionProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFired = useRef(false);

  const handleStart = useCallback(() => {
    longPressFired.current = false;
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        longPressFired.current = true;
        onLongPress();
      }, 500);
    }
  }, [onLongPress]);

  const handleEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!longPressFired.current) {
      onClick?.();
    }
  }, [onClick]);

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      className="flex flex-col items-center gap-1 group select-none transition-colors"
    >
      <div>{icon}</div>
      <span className="text-white text-xs font-normal">{count || 0}</span>
    </button>
  );
};

interface ThreeDotMenuProps {
  video: IPost | any;
  index: number;
  onSave: () => void;
  onInterested: () => void;
  onNotInterested: () => void;
  onDelete: () => void;
  isOwner: boolean;
  isSaved: boolean;
  isInterested: boolean;
  isNotInterested: boolean;
}

const ThreeDotMenu = ({ video, index, onSave, onInterested, onNotInterested, onDelete, isOwner, isSaved, isInterested, isNotInterested }: ThreeDotMenuProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { 
      label: isSaved ? "Saved" : "Save", 
      icon: <BookmarkIcon className={`h-4 w-4 ${isSaved ? 'text-[#4E4AFC]' : ''}`} />, 
      action: onSave 
    },
    { 
      label: isInterested ? "Interested ✓" : "Interested", 
      icon: <StarIcon className={`h-4 w-4 ${isInterested ? 'text-yellow-400' : ''}`} />, 
      action: onInterested 
    },
    { 
      label: isNotInterested ? "Not Interested ✓" : "Not Interested", 
      icon: <XCircleIcon className={`h-4 w-4 ${isNotInterested ? 'text-red-400' : ''}`} />, 
      action: onNotInterested 
    },
  ];

  if (isOwner) {
    menuItems.push({ 
      label: "Delete", 
      icon: <TrashIcon className="h-4 w-4" />, 
      action: onDelete, 
      danger: true 
    } as any);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex flex-col items-center gap-1 group select-none transition-colors"
      >
        <div>
          <EllipsisHorizontalIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
        </div>
        <span className="text-white text-xs font-normal">Menu</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#101A2F] rounded-xl overflow-hidden z-50 border border-white/20">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.action();
                setShowMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150 text-left ${
                (item as any).danger ? 'text-red-400 hover:text-red-300' : 'text-white/80 hover:text-white'
              } hover:bg-white/10`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RepostButton = ({ count, onClick, isReposted }: { count?: number; onClick?: () => void; isReposted?: boolean }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group select-none transition-colors"
    >
      <div>
        {isReposted ? (
          <ArrowPathIcon className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />
        ) : (
          <ArrowPathIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white group-hover:text-green-400 transition-colors" />
        )}
      </div>
      <span className="text-white text-xs font-normal">{count || 0}</span>
    </button>
  );
};

const FloatingHeart = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
      <HeartSolidIcon
        className="h-28 w-28 text-red-500"
        style={{ animation: "floatHeart 0.8s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards" }}
      />
    </div>
  );
};

const LikesModal = ({ video, onClose }: { video: IPost | any; onClose: () => void }) => {
  const videoId = video._id || video.id;
  const { data: fetchedLikes, isLoading } = useQuery({
    queryKey: ["likes", videoId],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(`/posts/${videoId}/likes`);
        if (res.data.success && Array.isArray(res.data.data)) return res.data.data;
      } catch { return null; }
      return null;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const [likesWithDetails, setLikesWithDetails] = useState<any[]>([]);

  useEffect(() => {
    const fetchLikesDetails = async () => {
      if (fetchedLikes && fetchedLikes.length > 0) {
        const users = await Promise.all(
          fetchedLikes.map(async (like: any) => {
            if (like._id && like.fullName) return like;
            try {
              const res = await axiosInstance.get(`/users/id/${like.userId || like._id}`);
              return res.data.data;
            } catch {
              return {
                _id: like.userId || like._id,
                fullName: like.userName || like.name || "User",
                profilePicture: like.userProfilePicture || like.profilePicture
              };
            }
          })
        );
        setLikesWithDetails(users);
      } else if (video.likes && video.likes.length > 0) {
        const users = await Promise.all(
          video.likes.map(async (userId: string) => {
            try {
              const res = await axiosInstance.get(`/users/id/${userId}`);
              return res.data.data;
            } catch {
              const vUserId = video.userId || video.user?._id || video.user?.id;
              const vUserName = video.userName || video.user?.fullName;
              const vUserPic = video.userProfilePicture || video.user?.profilePicture?.url;
              return {
                _id: userId,
                fullName: userId === vUserId ? vUserName : "User",
                profilePicture: userId === vUserId ? vUserPic : null
              };
            }
          })
        );
        setLikesWithDetails(users);
      }
    };
    
    fetchLikesDetails();
  }, [fetchedLikes, video]);

  const displayLikes = likesWithDetails.length > 0 ? likesWithDetails : fetchedLikes || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[#101A2F] rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <HeartSolidIcon className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-normal text-white">Reactions <span className="text-white/50 text-base">({video.likesCount || displayLikes.length})</span></h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-white/10 active:bg-white/20 transition">
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#4E4AFC] border-t-transparent rounded-full animate-spin" /></div>
          ) : displayLikes.length === 0 ? (
            <div className="text-center py-12">
              <HeartIcon className="h-12 w-12 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No reactions yet</p>
            </div>
          ) : (
            displayLikes.map((person: any, i: number) => (
              <div key={person._id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                <div className="w-10 h-10 rounded-full bg-[#4E4AFC] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {person.profilePicture?.url || person.profilePicture ? (
                    <Image src={person.profilePicture?.url || person.profilePicture} alt={person.fullName || person.name || "User"} width={40} height={40} className="object-cover" />
                  ) : (<UserIcon className="h-5 w-5 text-white" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-normal text-sm truncate">{person.fullName || person.name || "User"}</p>
                </div>
                <HeartSolidIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface VideoPlayerProps {
  video: IPost | any;
  isMuted: boolean;
  isActive: boolean;
  onDoubleTap?: () => void;
  onVideoRef?: (el: HTMLVideoElement) => void;
}

const VideoPlayer = ({ video, isMuted, isActive, onDoubleTap, onVideoRef }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const lastTapRef = useRef(0);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { if (onVideoRef && videoRef.current) onVideoRef(videoRef.current); }, [onVideoRef]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && !userPaused) {
      const playPromise = el.play();
      if (playPromise !== undefined) playPromise.catch(() => setIsPlaying(false));
    } else if (!isActive) { el.pause(); setIsPlaying(false); }
  }, [isActive, userPaused]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = isMuted; }, [isMuted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => requestAnimationFrame(() => { if (el.duration) setProgress((el.currentTime / el.duration) * 100); });
    const onMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { el.currentTime = 0; if (!userPaused && isActive) el.play().catch(() => {}); };
    
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [userPaused, isActive]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => { if (isPlaying) setShowControls(false); }, 2000);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); setUserPaused(false); }
    else { el.pause(); setUserPaused(true); }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) onDoubleTap?.();
    else togglePlay();
    lastTapRef.current = now;
  }, [onDoubleTap, togglePlay]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current && duration) {
      videoRef.current.currentTime = pct * duration;
      setProgress(pct * 100);
      if (videoRef.current.paused && !userPaused) videoRef.current.play().catch(() => {});
    }
    showControlsTemporarily();
  }, [duration, userPaused, showControlsTemporarily]);

  const handleMouseMove = useCallback(() => showControlsTemporarily(), [showControlsTemporarily]);

  const formatTime = (s: number) => { if (!s || isNaN(s)) return "0:00"; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; };

  const mediaUrl = video.mediaUrl || video.media?.url;

  return (
    <div className="absolute inset-0 w-full h-full group" onMouseMove={handleMouseMove} onTouchStart={handleMouseMove}>
      <video ref={videoRef} src={mediaUrl} className="w-full h-full object-contain" poster={video.mediaThumbnail || video.media?.thumbnail || ""} muted={isMuted} playsInline preload="metadata" onClick={handleTap} />
      {!isPlaying && (<div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity duration-300" onClick={handleTap}><PlayIcon className="h-20 w-20 text-white animate-scaleIn" /></div>)}
      {(showControls || !isPlaying) && (
        <div className="absolute bottom-16 md:bottom-0 left-0 right-0 bg-black/75 p-4 pb-3 transition-opacity duration-300">
          <div className="w-full mb-3">
            <div className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer relative overflow-hidden" onClick={handleSeek}>
              <div className="absolute left-0 top-0 h-full bg-[#4E4AFC] rounded-full" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-[#4E4AFC] transition-colors p-1">
                {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
              </button>
              <span className="text-white text-xs font-mono">{formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}</span>
            </div>
            <button onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }} className="text-white hover:text-[#4E4AFC] transition-colors p-1">
              {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const VideoSkeleton = () => (
  <div className="relative bg-black" style={{ height: "100vh", width: "100vw" }}>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-white/10 mb-4" />
        <div className="h-4 bg-white/10 rounded w-32 mb-2" />
        <div className="h-3 bg-white/10 rounded w-24" />
      </div>
    </div>
  </div>
);

export const VideosPage = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [isMuted, setIsMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentModal, setCommentModal] = useState<{ isOpen: boolean; video: any; index: number | null }>({ isOpen: false, video: null, index: null });
  const [likesModal, setLikesModal] = useState<{ isOpen: boolean; video: any }>({ isOpen: false, video: null });
  const [shareModal, setShareModal] = useState<{ isOpen: boolean; video: any; index?: number }>({ isOpen: false, video: null });
  const [commentText, setCommentText] = useState("");
  const [floatingHearts, setFloatingHearts] = useState<Record<string, number>>({});
  
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [interestedPosts, setInterestedPosts] = useState<Record<string, boolean>>({});
  const [notInterestedPosts, setNotInterestedPosts] = useState<Record<string, boolean>>({});
  const [repostedPosts, setRepostedPosts] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeIndexRef = useRef(0);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const isDraggingRef = useRef(false);
// [wip step 1/2]
