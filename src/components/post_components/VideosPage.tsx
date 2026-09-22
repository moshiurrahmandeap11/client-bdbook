"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { postService } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import { cn } from "@/lib/utils";
import {
  ArrowPathIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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
      className="flex flex-col items-center gap-1 group select-none transition-colors cursor-pointer"
    >
      <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg">
        {icon}
      </div>
      <span className="text-white text-[11px] font-semibold drop-shadow">{count || 0}</span>
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
      icon: <BookmarkIcon className={`h-4 w-4 ${isSaved ? 'text-primary' : ''}`} />, 
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
        className="flex flex-col items-center gap-1 group select-none transition-colors cursor-pointer"
      >
        <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg">
          <EllipsisHorizontalIcon className="h-6 w-6 text-white" />
        </div>
        <span className="text-white text-[11px] font-semibold drop-shadow">More</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#101A2F] rounded-xl overflow-hidden z-50 border border-white/20 shadow-2xl">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.action();
                setShowMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150 text-left cursor-pointer ${
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
      className="flex flex-col items-center gap-1 group select-none transition-colors cursor-pointer"
    >
      <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg">
        <ArrowPathIcon
          className={cn(
            "h-6 w-6 transition-colors",
            isReposted ? "text-emerald-400" : "text-white group-hover:text-emerald-400"
          )}
        />
      </div>
      <span className="text-white text-[11px] font-semibold drop-shadow">{count || 0}</span>
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
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : displayLikes.length === 0 ? (
            <div className="text-center py-12">
              <HeartIcon className="h-12 w-12 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No reactions yet</p>
            </div>
          ) : (
            displayLikes.map((person: any, i: number) => (
              <div key={person._id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
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
    <div
      className="relative w-full h-full group overflow-hidden bg-black select-none"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Ambient Blurred Backdrop inside Reel Card */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
        <video
          src={mediaUrl}
          poster={video.mediaThumbnail || video.media?.thumbnail || ""}
          className="w-full h-full object-cover blur-2xl scale-125 opacity-40 brightness-75"
          muted
          tabIndex={-1}
          playsInline
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Main Crisp Reel Video */}
      <video
        ref={videoRef}
        src={mediaUrl}
        className="w-full h-full object-contain relative z-10 cursor-pointer"
        poster={video.mediaThumbnail || video.media?.thumbnail || ""}
        muted={isMuted}
        playsInline
        preload="metadata"
        onClick={handleTap}
      />

      {/* Central Play Indicator Overlay */}
      {!isPlaying && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 cursor-pointer transition-opacity duration-200"
          onClick={handleTap}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xl animate-scaleIn">
            <PlayIcon className="h-8 w-8 ml-1" />
          </div>
        </div>
      )}

      {/* Sound Toggle Button at Top Right of Reel Card */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
        }}
        className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
      </button>

      {/* Sleek Instagram/Reels Style Bottom Progress Track */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1.5 hover:h-2.5 bg-white/20 z-30 cursor-pointer transition-all"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-primary rounded-r-full relative transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefsMap = useRef(new Map<string, HTMLVideoElement>());

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["videos"],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await postService.getPosts({ page: pageParam, limit: 8 });
      const videoPosts = res.data.filter((p: IPost) => p.mediaType === "video" || p.media?.resourceType === "video");
      return { data: videoPosts, pagination: res.pagination };
    },
    getNextPageParam: (last: any) => {
      const page = last?.pagination?.page || 1;
      const pages = last?.pagination?.pages || 1;
      return page < pages ? page + 1 : undefined;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const allVideos = useMemo(() => data?.pages.flatMap((p) => p.data) || [], [data]);

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const snapToIndex = useCallback((index: number, fast = false) => {
    if (!containerRef.current) return;
    const total = allVideos.length;
    const clamped = Math.max(0, Math.min(index, total - 1));
    const duration = fast ? "0.15s" : "0.25s";
    containerRef.current.style.transition = `transform ${duration} cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
    containerRef.current.style.transform = `translateY(-${clamped * 100}vh)`;
    setActiveIndex(clamped);
    if (clamped >= total - 2 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [allVideos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() }; isDraggingRef.current = true; if (containerRef.current) containerRef.current.style.transition = "none"; }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => { if (!isDraggingRef.current) return; const diff = e.touches[0].clientY - touchStartRef.current.y; const base = -activeIndexRef.current * window.innerHeight; const idx = activeIndexRef.current; const resistance = (idx === 0 && diff > 0) || (idx >= allVideos.length - 1 && diff < 0) ? 0.3 : 1; if (containerRef.current) containerRef.current.style.transform = `translateY(${base + diff * resistance}px)`; }, [allVideos.length]);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => { if (!isDraggingRef.current) return; isDraggingRef.current = false; const diff = e.changedTouches[0].clientY - touchStartRef.current.y; const elapsed = Date.now() - touchStartRef.current.time; const velocity = Math.abs(diff) / elapsed; const cur = activeIndexRef.current; const shouldChange = velocity > 0.3 || Math.abs(diff) > 40; if (shouldChange && diff < 0 && cur < allVideos.length - 1) snapToIndex(cur + 1, velocity > 0.6); else if (shouldChange && diff > 0 && cur > 0) snapToIndex(cur - 1, velocity > 0.6); else snapToIndex(cur); touchStartRef.current = { y: 0, time: 0 }; }, [allVideos.length, snapToIndex]);
  const handleWheel = useCallback((e: WheelEvent) => { e.preventDefault(); if (scrollTimeoutRef.current) return; const cur = activeIndexRef.current; if (e.deltaY > 0 && cur < allVideos.length - 1) snapToIndex(cur + 1); else if (e.deltaY < 0 && cur > 0) snapToIndex(cur - 1); scrollTimeoutRef.current = setTimeout(() => { scrollTimeoutRef.current = null; }, 200); }, [allVideos.length, snapToIndex]);

  useEffect(() => {
    const wrapper = document.getElementById("video-wrapper");
    if (wrapper) { wrapper.addEventListener("wheel", handleWheel, { passive: false }); return () => wrapper.removeEventListener("wheel", handleWheel); }
  }, [handleWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        snapToIndex(activeIndexRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        snapToIndex(activeIndexRef.current - 1);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [snapToIndex]);

  const currentUserId = user?._id || user?.id;

  const likeMutation = useMutation({
    mutationFn: ({ videoId }: { videoId: string; index: number }) => postService.likePost(videoId),
    onMutate: async ({ videoId, index }) => {
      await queryClient.cancelQueries({ queryKey: ["videos"] });
      const prev = queryClient.getQueryData(["videos"]);
      queryClient.setQueryData(["videos"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, pi: number) => ({
            ...page,
            data: page.data.map((video: any, vi: number) => {
              if (pi === Math.floor(index / 8) && vi === index % 8) {
                const liked = video.likes?.includes(currentUserId);
                return {
                  ...video,
                  likesCount: liked ? (video.likesCount || 0) - 1 : (video.likesCount || 0) + 1,
                  likes: liked ? video.likes.filter((id: string) => id !== currentUserId) : [...(video.likes || []), currentUserId]
                };
              }
              return video;
            })
          }))
        };
      });
      return { prev };
    },
    onError: (_, __, ctx: any) => { queryClient.setQueryData(["videos"], ctx.prev); toast.error("Failed to like video"); },
  });

  const commentMutation = useMutation({
    mutationFn: ({ videoId, text }: { videoId: string; text: string; index: number }) => postService.commentPost(videoId, text),
    onSuccess: (_, { index }) => {
      queryClient.setQueryData(["videos"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, pi: number) => ({
            ...page,
            data: page.data.map((video: any, vi: number) => {
              if (pi === Math.floor(index / 8) && vi === index % 8) return { ...video, commentsCount: (video.commentsCount || 0) + 1 };
              return video;
            })
          }))
        };
      });
      setCommentText("");
      setCommentModal({ isOpen: false, video: null, index: null });
      toast.success("Comment added!");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const shareMutation = useMutation({
    mutationFn: async ({ videoId }: { videoId: string; video: any; index?: number }) => {
      return postService.sharePost(videoId);
    },
    onSuccess: (_, { index }) => {
      toast.success("Video shared to your feed!");
      if (index !== undefined) {
        queryClient.setQueryData(["videos"], (old: any) => {
          if (!old) return old;
          return { ...old, pages: old.pages.map((page: any, pi: number) => ({ ...page, data: page.data.map((videoItem: any, vi: number) => { if (pi === Math.floor(index / 8) && vi === index % 8) { return { ...videoItem, sharesCount: (videoItem.sharesCount || 0) + 1 }; } return videoItem; }) })) };
        });
      }
      setShareModal({ isOpen: false, video: null });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to share video");
    },
  });

  const shareToMessageMutation = useMutation({
    mutationFn: async ({ friendId, video }: { friendId: string; video: any }) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const vId = video._id || video.id;
      const postUrl = `${origin}/post/details/${vId}`;
      const res = await axiosInstance.post(`/users/send-message/${friendId}`, {
        message: JSON.stringify({
          type: "post_share",
          postId: vId,
          postUrl,
          postText: video.description || "Check out this video",
          postAuthor: video.userName || video.user?.fullName,
          postAuthorProfilePic: video.userProfilePicture || video.user?.profilePicture?.url,
          hasMedia: !!(video.mediaUrl || video.media?.url),
          mediaType: video.mediaType || video.media?.resourceType,
          mediaUrl: video.mediaUrl || video.media?.url,
          sharedBy: user?.fullName || user?.name,
          sharedByProfilePic: typeof user?.profilePicture === "object" ? user?.profilePicture?.url : user?.profilePicture || user?.avatar,
        }),
        messageType: "share",
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Video shared via message!");
      setShareModal({ isOpen: false, video: null });
    },
    onError: () => toast.error("Failed to share via message"),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string; index: number }) => {
      const res = await axiosInstance.post(`/posts/${postId}/save`);
      return res.data;
    },
    onSuccess: (resData, { postId, index }) => {
      setSavedPosts(prev => ({ ...prev, [postId]: resData.data.isSaved }));
      toast.success(resData.message || "Post saved");
    },
    onError: () => toast.error("Failed to save post"),
  });

  const interestedMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const res = await axiosInstance.post(`/posts/${postId}/interested`);
      return res.data;
    },
    onSuccess: (resData, { postId }) => {
      setInterestedPosts(prev => ({ ...prev, [postId]: resData.data.isInterested }));
      toast.success(resData.message || "Marked interested");
    },
    onError: () => toast.error("Failed to mark interest"),
  });

  const notInterestedMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const res = await axiosInstance.post(`/posts/${postId}/not-interested`);
      return res.data;
    },
    onSuccess: (resData, { postId }) => {
      setNotInterestedPosts(prev => ({ ...prev, [postId]: resData.data.isNotInterested }));
      toast.success(resData.message || "Marked not interested");
    },
    onError: () => toast.error("Failed to mark as not interested"),
  });

  const repostMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string; index: number }) => {
      const res = await axiosInstance.post(`/posts/${postId}/repost`);
      return res.data;
    },
    onSuccess: (_, { postId, index }) => {
      setRepostedPosts(prev => ({ ...prev, [postId]: true }));
      toast.success("Post reposted to your profile!");
    },
    onError: () => toast.error("Failed to repost"),
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string; index: number }) => {
      return postService.deletePost(postId);
    },
    onSuccess: (_, { index }) => {
      toast.success("Video deleted");
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      if (index === activeIndex && allVideos.length > 1) {
        setTimeout(() => snapToIndex(Math.max(0, activeIndex - 1)), 100);
      }
    },
    onError: () => toast.error("Failed to delete video"),
  });

  const handleDoubleTap = (video: any, index: number) => {
    if (!isAuthenticated) return;
    const vId = video._id || video.id;
    const isLiked = video.likes?.includes(currentUserId);
    if (!isLiked) likeMutation.mutate({ videoId: vId, index });
    setFloatingHearts(prev => ({ ...prev, [vId]: Date.now() }));
  };

  const handleLike = (video: any, index: number) => {
    if (!isAuthenticated) { toast.error("Please login to like videos"); return; }
    const vId = video._id || video.id;
    likeMutation.mutate({ videoId: vId, index });
  };

  const handleCommentSubmit = () => {
    if (!isAuthenticated) { toast.error("Please login to comment"); return; }
    if (!commentText.trim()) { toast.error("Please write a comment"); return; }
    if (!commentModal.video || commentModal.index === null) return;
    const vId = commentModal.video._id || commentModal.video.id;
    commentMutation.mutate({ videoId: vId, text: commentText, index: commentModal.index });
  };

  const handleShareClick = useCallback((video: any, index: number) => {
    if (!isAuthenticated) { toast.error("Please login to share"); return; }
    setShareModal({ isOpen: true, video, index });
  }, [isAuthenticated]);

  const getSharePreview = useCallback((video: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const vId = video._id || video.id;
    const postUrl = `${origin}/post/details/${vId}`;
    const text = video.description || "Check out this video";
    return { postUrl, text };
  }, []);

  const handleShareToFeed = useCallback(() => {
    if (!shareModal.video) return;
    const vId = shareModal.video._id || shareModal.video.id;
    shareMutation.mutate({ videoId: vId, video: shareModal.video, index: shareModal.index });
  }, [shareModal.video, shareModal.index, shareMutation]);

  const handleShareToMessage = useCallback((friendId: string) => {
    if (!shareModal.video) return;
    shareToMessageMutation.mutate({ friendId, video: shareModal.video });
  }, [shareModal.video, shareToMessageMutation]);

  const handleCopyLink = useCallback(() => {
    toast.success("Link copied!");
  }, []);

  const handleRepost = useCallback((video: any, index: number) => {
    if (!isAuthenticated) { toast.error("Please login to repost"); return; }
    const vId = video._id || video.id;
    if (repostedPosts[vId]) {
      toast.error("You already reposted this");
      return;
    }
    repostMutation.mutate({ postId: vId, index });
  }, [isAuthenticated, repostedPosts, repostMutation]);

  const getTimeAgo = (date?: string | Date) => {
    if (!date) return "recently";
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (isLoading && allVideos.length === 0) {
    return (<div className="min-h-screen bg-black">{[...Array(3)].map((_, i) => <VideoSkeleton key={i} />)}</div>);
  }

  if (!isLoading && allVideos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <VideoCameraIcon className="h-20 w-20 text-white/30 mx-auto mb-4" />
          <p className="text-white/60 text-lg mb-4">No videos yet</p>
          {isAuthenticated && (
            <Link href="/" className="inline-block px-6 py-2 bg-primary hover:bg-primary-hover text-white font-normal rounded-xl transition-colors">
              Create First Video Post
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="video-wrapper" className="fixed inset-0 bg-[#0B0D14] overflow-hidden select-none">
        {/* Desktop Ambient Backdrop from Active Reel */}
        {allVideos[activeIndex] && (
          <div className="hidden sm:block absolute inset-0 overflow-hidden pointer-events-none opacity-25 z-0" aria-hidden="true">
            <video
              src={allVideos[activeIndex].mediaUrl || allVideos[activeIndex].media?.url}
              poster={allVideos[activeIndex].mediaThumbnail || allVideos[activeIndex].media?.thumbnail || ""}
              className="w-full h-full object-cover blur-3xl scale-125"
              muted
              playsInline
              tabIndex={-1}
            />
            <div className="absolute inset-0 bg-[#0B0D14]/80 backdrop-blur-2xl" />
          </div>
        )}
        
        <div ref={containerRef} className="w-full h-full relative z-10" style={{ transform: "translateY(0px)", willChange: "transform" }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {allVideos.map((video: any, index: number) => {
            const vId = video._id || video.id;
            const isLiked = video.likes?.includes(currentUserId) || false;
            const isActive = index === activeIndex;
            const isVideoSaved = savedPosts[vId] || video.isSaved || false;
            const isVideoInterested = interestedPosts[vId] || false;
            const isVideoNotInterested = notInterestedPosts[vId] || false;
            const isVideoReposted = repostedPosts[vId] || video.isReposted || false;
            const videoOwnerId = video.userId || video.user?._id || video.user?.id;
            const videoUserName = video.userName || video.user?.fullName || "User";
            const videoUserPic = video.userProfilePicture || video.user?.profilePicture?.url;
            
            const videoOwnerUsername =
              video.user?.username ||
              video.username ||
              video.userName?.toLowerCase().replace(/\s+/g, "") ||
              videoOwnerId;
            
            return (
              <div key={vId} className="relative w-full h-screen flex items-center justify-center select-none" style={{ height: "100vh", width: "100vw" }}>
                {/* Authentic 9:16 Reel Card Container */}
                <div className="relative w-full h-full sm:w-[420px] sm:h-[calc(100vh-80px)] sm:max-h-[820px] sm:rounded-2xl overflow-hidden shadow-2xl bg-black sm:border sm:border-white/15 flex items-center justify-center">
                  <VideoPlayer video={video} isMuted={isMuted} isActive={isActive} onDoubleTap={() => handleDoubleTap(video, index)} onVideoRef={(ref) => videoRefsMap.current.set(vId, ref)} />
                  {floatingHearts[vId] && <FloatingHeart onDone={() => setFloatingHearts(p => { const n = { ...p }; delete n[vId]; return n; })} />}

                  {/* Video Info Overlay (Bottom Left inside card) */}
                  <div className="absolute bottom-4 left-3 right-16 sm:right-3 z-20 pointer-events-auto">
                    <Link href={`/s/${videoOwnerUsername}`} className="flex items-center gap-2.5 mb-2 group/author w-fit">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-2 ring-white/30 shrink-0 shadow">
                        {videoUserPic ? (
                          <Image src={videoUserPic} alt={videoUserName} width={40} height={40} className="object-cover w-full h-full" loading="lazy" />
                        ) : (<UserIcon className="h-5 w-5 text-white" />)}
                      </div>
                      <div className="flex flex-col drop-shadow">
                        <span className="font-semibold text-white text-sm group-hover/author:underline">{videoUserName}</span>
                        <span className="text-white/70 text-xs">@{videoOwnerUsername} • {getTimeAgo(video.createdAt)}</span>
                      </div>
                    </Link>

                    {video.description && (
                      <p onClick={() => window.location.href = `/post/details/${vId}`} className="text-white text-xs sm:text-sm mb-2 line-clamp-2 cursor-pointer leading-relaxed drop-shadow">
                        {video.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-white/80 text-xs drop-shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="truncate">Original audio • Stalk Reels</span>
                    </div>
                  </div>

                  {/* Mobile Action Buttons (Right side inside card) */}
                  <div className="sm:hidden absolute right-3 bottom-20 flex flex-col items-center gap-4 z-20">
                    <VideoAction
                      icon={isLiked ? <HeartSolidIcon className="h-6 w-6 text-rose-500 scale-110" /> : <HeartIcon className="h-6 w-6 text-white" />}
                      count={video.likesCount || video.likes?.length || 0}
                      onClick={() => handleLike(video, index)}
                      onLongPress={() => setLikesModal({ isOpen: true, video })}
                    />
                    <VideoAction
                      icon={<ChatBubbleLeftIcon className="h-6 w-6 text-white" />}
                      count={video.commentsCount || video.comments?.length || 0}
                      onClick={() => setCommentModal({ isOpen: true, video, index })}
                    />
                    <RepostButton
                      count={video.repostsCount || 0}
                      isReposted={isVideoReposted}
                      onClick={() => handleRepost(video, index)}
                    />
                    <VideoAction
                      icon={<ShareIcon className="h-6 w-6 text-white" />}
                      count={video.sharesCount || 0}
                      onClick={() => handleShareClick(video, index)}
                    />
                    <ThreeDotMenu
                      video={video}
                      index={index}
                      isOwner={videoOwnerId === currentUserId}
                      isSaved={isVideoSaved}
                      isInterested={isVideoInterested}
                      isNotInterested={isVideoNotInterested}
                      onSave={() => saveMutation.mutate({ postId: vId, index })}
                      onInterested={() => interestedMutation.mutate({ postId: vId })}
                      onNotInterested={() => notInterestedMutation.mutate({ postId: vId })}
                      onDelete={() => deleteVideoMutation.mutate({ postId: vId, index })}
                    />
                  </div>
                </div>

                {/* Desktop Action Buttons & Chevrons docked beside the Reel Card */}
                <div className="hidden sm:flex flex-col items-center gap-3.5 ml-4 z-20">
                  <button
                    onClick={() => snapToIndex(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer mb-1 shadow-lg"
                    title="Previous Reel (Up Arrow)"
                  >
                    <ChevronUpIcon className="h-5 w-5" />
                  </button>

                  <VideoAction
                    icon={isLiked ? <HeartSolidIcon className="h-6 w-6 text-rose-500 scale-110" /> : <HeartIcon className="h-6 w-6 text-white" />}
                    count={video.likesCount || video.likes?.length || 0}
                    onClick={() => handleLike(video, index)}
                    onLongPress={() => setLikesModal({ isOpen: true, video })}
                  />
                  <VideoAction
                    icon={<ChatBubbleLeftIcon className="h-6 w-6 text-white" />}
                    count={video.commentsCount || video.comments?.length || 0}
                    onClick={() => setCommentModal({ isOpen: true, video, index })}
                  />
                  <RepostButton
                    count={video.repostsCount || 0}
                    isReposted={isVideoReposted}
                    onClick={() => handleRepost(video, index)}
                  />
                  <VideoAction
                    icon={<ShareIcon className="h-6 w-6 text-white" />}
                    count={video.sharesCount || 0}
                    onClick={() => handleShareClick(video, index)}
                  />
                  <ThreeDotMenu
                    video={video}
                    index={index}
                    isOwner={videoOwnerId === currentUserId}
                    isSaved={isVideoSaved}
                    isInterested={isVideoInterested}
                    isNotInterested={isVideoNotInterested}
                    onSave={() => saveMutation.mutate({ postId: vId, index })}
                    onInterested={() => interestedMutation.mutate({ postId: vId })}
                    onNotInterested={() => notInterestedMutation.mutate({ postId: vId })}
                    onDelete={() => deleteVideoMutation.mutate({ postId: vId, index })}
                  />

                  <button
                    onClick={() => snapToIndex(activeIndex + 1)}
                    disabled={activeIndex >= allVideos.length - 1}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer mt-1 shadow-lg"
                    title="Next Reel (Down Arrow)"
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {isFetchingNextPage && (<div className="relative bg-black flex items-center justify-center" style={{ height: "100vh", width: "100vw" }}><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>)}
          {!hasNextPage && allVideos.length > 0 && (
            <div className="relative bg-black flex items-center justify-center" style={{ height: "100vh", width: "100vw" }}>
              <div className="text-center px-6">
                <VideoCameraIcon className="h-16 w-16 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 mb-4">You've seen all videos! 🎉</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary hover:bg-primary-hover rounded-md text-white text-sm font-normal transition-colors">Watch Again</button>
              </div>
            </div>
          )}
        </div>
        
        {/* Comment Modal */}
        {commentModal.isOpen && (
          <div className="fixed inset-0 bottom-22 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setCommentModal({ isOpen: false, video: null, index: null })}>
            <div className="relative w-full sm:max-w-lg bg-[#101A2F] rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-normal text-white">Comments</h3>
                <button onClick={() => setCommentModal({ isOpen: false, video: null, index: null })} className="p-1 rounded-full bg-white/10 active:bg-white/20 transition">
                  <XMarkIcon className="h-5 w-5 text-white" />
                </button>
              </div>
              <div className="p-4 border-b border-white/10 flex gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {commentModal.video?.userProfilePicture || commentModal.video?.user?.profilePicture?.url ? (
                    <Image src={commentModal.video.userProfilePicture || commentModal.video.user.profilePicture.url} alt={commentModal.video.userName || "User"} width={48} height={48} className="object-cover" loading="lazy" />
                  ) : (<UserIcon className="h-6 w-6 text-white" />)}
                </div>
                <div className="flex-1">
                  <p className="font-normal text-white">{commentModal.video?.userName || commentModal.video?.user?.fullName}</p>
                  <p className="text-white/70 text-sm line-clamp-2">{commentModal.video?.description}</p>
                </div>
              </div>
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()} placeholder="Write a comment..." className="flex-1 bg-white/10 border border-white/20 rounded-md px-4 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
                  <button onClick={handleCommentSubmit} disabled={!commentText.trim()} className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-md text-white text-sm font-normal disabled:opacity-50 transition-colors">
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 text-center border-t border-white/10">
                <button onClick={() => { setCommentModal({ isOpen: false, video: null, index: null }); window.location.href = `/post/details/${commentModal.video?._id || commentModal.video?.id}`; }} className="text-primary text-sm hover:underline transition-colors">
                  View all {commentModal.video?.commentsCount || commentModal.video?.comments?.length || 0} comments
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Likes Modal */}
        {likesModal.isOpen && likesModal.video && <LikesModal video={likesModal.video} onClose={() => setLikesModal({ isOpen: false, video: null })} />}
        
        {/* Share Modal */}
        {shareModal.isOpen && shareModal.video && (
          <ShareModal
            post={shareModal.video}
            user={user}
            sharePreview={getSharePreview(shareModal.video)}
            onClose={() => setShareModal({ isOpen: false, video: null })}
            onShareToFeed={handleShareToFeed}
            onShareToMessage={handleShareToMessage}
            onCopyLink={handleCopyLink}
            isSharingToFeed={shareMutation.isPending}
            isSharingToMessage={shareToMessageMutation.isPending}
          />
        )}
      </div>
    </>
  );
};

export default VideosPage;

