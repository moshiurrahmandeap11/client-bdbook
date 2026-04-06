// VideosPage.jsx - Complete Optimized Version

"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ShareModal from "./ShareModal";

// Optimized Video Action Button
const VideoAction = ({ icon, count, onClick, onLongPress }) => {
  const timerRef = useRef(null);
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
      className="flex flex-col items-center gap-1 group select-none active:scale-90 transition-transform"
    >
      <div className="drop-shadow-lg">{icon}</div>
      <span className="text-white text-xs font-medium drop-shadow">{count || 0}</span>
    </button>
  );
};

// Three Dot Menu Component
const ThreeDotMenu = ({ video, index, onSave, onInterested, onNotInterested, onDelete, isOwner, isSaved, isInterested, isNotInterested }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { 
      label: isSaved ? "Saved" : "Save", 
      icon: <BookmarkIcon className={`h-4 w-4 ${isSaved ? 'text-purple-400' : ''}`} />, 
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
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex flex-col items-center gap-1 group select-none active:scale-90 transition-transform"
      >
        <div className="drop-shadow-lg">
          <EllipsisHorizontalIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
        </div>
        <span className="text-white text-xs font-medium drop-shadow">Menu</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-xl overflow-hidden shadow-xl z-50 border border-white/20">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.action();
                setShowMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150 text-left ${
                item.danger ? 'text-red-400 hover:text-red-300' : 'text-white/80 hover:text-white'
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

// Repost Button Component
const RepostButton = ({ count, onClick, isReposted }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group select-none active:scale-90 transition-transform"
    >
      <div className="drop-shadow-lg">
        {isReposted ? (
          <ArrowPathIcon className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />
        ) : (
          <ArrowPathIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white group-hover:text-green-400 transition-colors" />
        )}
      </div>
      <span className="text-white text-xs font-medium drop-shadow">{count || 0}</span>
    </button>
  );
};

// Optimized Floating Heart
const FloatingHeart = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
      <HeartSolidIcon
        className="h-28 w-28 text-red-500 drop-shadow-2xl"
        style={{ animation: "floatHeart 0.8s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards" }}
      />
    </div>
  );
};

// Optimized Likes Modal
const LikesModal = ({ video, onClose }) => {
  const { data: fetchedLikes, isLoading } = useQuery({
    queryKey: ["likes", video._id],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(`/posts/${video._id}/likes`);
        if (res.data.success && Array.isArray(res.data.data)) return res.data.data;
      } catch { return null; }
      return null;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const [likesWithDetails, setLikesWithDetails] = useState([]);

  useEffect(() => {
    const fetchLikesDetails = async () => {
      if (fetchedLikes && fetchedLikes.length > 0) {
        const users = await Promise.all(
          fetchedLikes.map(async (like) => {
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
          video.likes.map(async (userId) => {
            try {
              const res = await axiosInstance.get(`/users/id/${userId}`);
              return res.data.data;
            } catch {
              return {
                _id: userId,
                fullName: userId === video.userId ? video.userName : "User",
                profilePicture: userId === video.userId ? video.userProfilePicture : null
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
      <div className="w-full sm:max-w-md bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <HeartSolidIcon className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white">Reactions <span className="text-white/50 text-base">({video.likesCount || displayLikes.length})</span></h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-white/10 active:bg-white/20 transition">
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : displayLikes.length === 0 ? (
            <div className="text-center py-12">
              <HeartIcon className="h-12 w-12 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No reactions yet</p>
            </div>
          ) : (
            displayLikes.map((person, i) => (
              <div key={person._id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {person.profilePicture?.url || person.profilePicture ? (
                    <Image src={person.profilePicture?.url || person.profilePicture} alt={person.fullName || person.name || "User"} width={40} height={40} className="object-cover" />
                  ) : (<UserIcon className="h-5 w-5 text-white" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{person.fullName || person.name || "User"}</p>
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

// Optimized Video Player
const VideoPlayer = ({ video, isMuted, isActive, onDoubleTap, onVideoRef }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const lastTapRef = useRef(0);
  const controlsTimerRef = useRef(null);

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

  const handleSeek = useCallback((e) => {
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

  const formatTime = (s) => { if (!s || isNaN(s)) return "0:00"; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; };

  return (
    <div className="absolute inset-0 w-full h-full group" onMouseMove={handleMouseMove} onTouchStart={handleMouseMove}>
      <video ref={videoRef} src={video.media?.url} className="w-full h-full object-contain" poster={video.media?.thumbnail || ""} muted={isMuted} playsInline preload="metadata" onClick={handleTap} />
      {!isPlaying && (<div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity duration-300" onClick={handleTap}><PlayIcon className="h-20 w-20 text-white drop-shadow-2xl animate-scaleIn" /></div>)}
      {(showControls || !isPlaying) && (
        <div className="absolute bottom-16 md:bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pb-3 transition-opacity duration-300">
          <div className="w-full mb-3">
            <div className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer relative overflow-hidden" onClick={handleSeek}>
              <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg -translate-x-1/2" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-purple-400 transition-transform hover:scale-110 p-1">
                {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
              </button>
              <span className="text-white text-xs font-mono">{formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}</span>
            </div>
            <button onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }} className="text-white hover:text-purple-400 transition-transform hover:scale-110 p-1">
              {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Optimized Skeleton
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

// ═══════════════════════════════════════════════════════════════════════════
// ── MAIN VIDEOS PAGE ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const VideosPage = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [isMuted, setIsMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentModal, setCommentModal] = useState({ isOpen: false, video: null, index: null });
  const [likesModal, setLikesModal] = useState({ isOpen: false, video: null });
  const [shareModal, setShareModal] = useState({ isOpen: false, video: null });
  const [commentText, setCommentText] = useState("");
  const [floatingHearts, setFloatingHearts] = useState({});
  
  // State for new features
  const [savedPosts, setSavedPosts] = useState({});
  const [interestedPosts, setInterestedPosts] = useState({});
  const [notInterestedPosts, setNotInterestedPosts] = useState({});
  const [repostedPosts, setRepostedPosts] = useState({});

  const containerRef = useRef(null);
  const activeIndexRef = useRef(0);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const isDraggingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const videoRefsMap = useRef(new Map());

  // Optimized infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["videos"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosInstance.get(`/posts?page=${pageParam}&limit=8`);
      if (res.data.success) return { data: res.data.data.filter((p) => p.media?.resourceType === "video"), pagination: res.data.pagination };
      return { data: [], pagination: { page: 1, pages: 1 } };
    },
    getNextPageParam: (last) => (last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const allVideos = useMemo(() => data?.pages.flatMap((p) => p.data) || [], [data]);

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const snapToIndex = useCallback((index, fast = false) => {
    if (!containerRef.current) return;
    const total = allVideos.length;
    const clamped = Math.max(0, Math.min(index, total - 1));
    const duration = fast ? "0.15s" : "0.25s";
    containerRef.current.style.transition = `transform ${duration} cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
    containerRef.current.style.transform = `translateY(-${clamped * 100}vh)`;
    setActiveIndex(clamped);
    if (clamped >= total - 2 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [allVideos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTouchStart = useCallback((e) => { touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() }; isDraggingRef.current = true; if (containerRef.current) containerRef.current.style.transition = "none"; }, []);
  const handleTouchMove = useCallback((e) => { if (!isDraggingRef.current) return; const diff = e.touches[0].clientY - touchStartRef.current.y; const base = -activeIndexRef.current * window.innerHeight; const idx = activeIndexRef.current; const resistance = (idx === 0 && diff > 0) || (idx >= allVideos.length - 1 && diff < 0) ? 0.3 : 1; if (containerRef.current) containerRef.current.style.transform = `translateY(${base + diff * resistance}px)`; }, [allVideos.length]);
  const handleTouchEnd = useCallback((e) => { if (!isDraggingRef.current) return; isDraggingRef.current = false; const diff = e.changedTouches[0].clientY - touchStartRef.current.y; const elapsed = Date.now() - touchStartRef.current.time; const velocity = Math.abs(diff) / elapsed; const cur = activeIndexRef.current; const shouldChange = velocity > 0.3 || Math.abs(diff) > 40; if (shouldChange && diff < 0 && cur < allVideos.length - 1) snapToIndex(cur + 1, velocity > 0.6); else if (shouldChange && diff > 0 && cur > 0) snapToIndex(cur - 1, velocity > 0.6); else snapToIndex(cur); touchStartRef.current = { y: 0, time: 0 }; }, [allVideos.length, snapToIndex]);
  const handleWheel = useCallback((e) => { e.preventDefault(); if (scrollTimeoutRef.current) return; const cur = activeIndexRef.current; if (e.deltaY > 0 && cur < allVideos.length - 1) snapToIndex(cur + 1); else if (e.deltaY < 0 && cur > 0) snapToIndex(cur - 1); scrollTimeoutRef.current = setTimeout(() => { scrollTimeoutRef.current = null; }, 200); }, [allVideos.length, snapToIndex]);

  useEffect(() => {
    const wrapper = document.getElementById("video-wrapper");
    if (wrapper) { wrapper.addEventListener("wheel", handleWheel, { passive: false }); return () => wrapper.removeEventListener("wheel", handleWheel); }
  }, [handleWheel]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: ({ videoId }) => axiosInstance.post(`/posts/${videoId}/like`),
    onMutate: async ({ videoId, index }) => {
      await queryClient.cancelQueries({ queryKey: ["videos"] });
      const prev = queryClient.getQueryData(["videos"]);
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page, pi) => ({ ...page, data: page.data.map((video, vi) => { if (pi === Math.floor(index / 8) && vi === index % 8) { const liked = video.likes?.includes(user?._id); return { ...video, likesCount: liked ? (video.likesCount || 0) - 1 : (video.likesCount || 0) + 1, likes: liked ? video.likes.filter(id => id !== user?._id) : [...(video.likes || []), user?._id] }; } return video; }) })) };
      });
      return { prev };
    },
    onError: (_, __, ctx) => { queryClient.setQueryData(["videos"], ctx.prev); toast.error("Failed to like video"); },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: ({ videoId, text }) => axiosInstance.post(`/posts/${videoId}/comment`, { text }),
    onSuccess: (_, { index }) => {
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page, pi) => ({ ...page, data: page.data.map((video, vi) => { if (pi === Math.floor(index / 8) && vi === index % 8) return { ...video, commentsCount: (video.commentsCount || 0) + 1 }; return video; }) })) };
      });
      setCommentText("");
      setCommentModal({ isOpen: false, video: null, index: null });
      toast.success("Comment added!");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  // Share mutations
  const shareMutation = useMutation({
    mutationFn: async ({ videoId }) => {
      const postId = String(videoId)?.trim();
      const res = await axiosInstance.post(`/posts/${postId}/share`);
      return res.data;
    },
    onSuccess: (_, { video, index }) => {
      toast.success("Video shared to your feed!");
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page, pi) => ({ ...page, data: page.data.map((videoItem, vi) => { if (pi === Math.floor(index / 8) && vi === index % 8) { return { ...videoItem, sharesCount: (videoItem.sharesCount || 0) + 1 }; } return videoItem; }) })) };
      });
      setShareModal({ isOpen: false, video: null });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to share video");
    },
  });

  const shareToMessageMutation = useMutation({
    mutationFn: async ({ friendId, video }) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const postUrl = `${origin}/post/details/${video._id}`;
      const res = await axiosInstance.post(`/users/send-message/${friendId}`, {
        message: JSON.stringify({
          type: "post_share",
          postId: video._id,
          postUrl: postUrl,
          postText: video.description || "Check out this video",
          postAuthor: video.userName,
          postAuthorProfilePic: video.userProfilePicture,
          hasMedia: !!video.media?.url,
          mediaType: video.media?.resourceType,
          mediaUrl: video.media?.url,
          sharedBy: user?.fullName,
          sharedByProfilePic: user?.profilePicture?.url,
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ postId }) => {
      const res = await axiosInstance.post(`/posts/${postId}/save`);
      return res.data;
    },
    onSuccess: (data, { postId, index }) => {
      setSavedPosts(prev => ({ ...prev, [postId]: data.data.isSaved }));
      toast.success(data.message);
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pi) => ({
            ...page,
            data: page.data.map((video, vi) => {
              if (pi === Math.floor(index / 8) && vi === index % 8) {
                return { ...video, isSaved: data.data.isSaved };
              }
              return video;
            })
          }))
        };
      });
    },
    onError: () => toast.error("Failed to save post"),
  });

  // Interested mutation
  const interestedMutation = useMutation({
    mutationFn: async ({ postId }) => {
      const res = await axiosInstance.post(`/posts/${postId}/interested`);
      return res.data;
    },
    onSuccess: (data, { postId }) => {
      setInterestedPosts(prev => ({ ...prev, [postId]: data.data.isInterested }));
      toast.success(data.message);
    },
    onError: () => toast.error("Failed to mark interest"),
  });

  // Not interested mutation
  const notInterestedMutation = useMutation({
    mutationFn: async ({ postId }) => {
      const res = await axiosInstance.post(`/posts/${postId}/not-interested`);
      return res.data;
    },
    onSuccess: (data, { postId }) => {
      setNotInterestedPosts(prev => ({ ...prev, [postId]: data.data.isNotInterested }));
      toast.success(data.message);
    },
    onError: () => toast.error("Failed to mark as not interested"),
  });

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: async ({ postId }) => {
      const res = await axiosInstance.post(`/posts/${postId}/repost`);
      return res.data;
    },
    onSuccess: (_, { postId, index }) => {
      setRepostedPosts(prev => ({ ...prev, [postId]: true }));
      toast.success("Post reposted to your profile!");
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pi) => ({
            ...page,
            data: page.data.map((video, vi) => {
              if (pi === Math.floor(index / 8) && vi === index % 8) {
                return { ...video, repostsCount: (video.repostsCount || 0) + 1, isReposted: true };
              }
              return video;
            })
          }))
        };
      });
    },
    onError: () => toast.error("Failed to repost"),
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async ({ postId }) => {
      const res = await axiosInstance.delete(`/posts/${postId}`);
      return res.data;
    },
    onSuccess: (_, { index }) => {
      toast.success("Video deleted");
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        const newPages = old.pages.map((page, pi) => ({
          ...page,
          data: page.data.filter((_, vi) => {
            const globalIndex = pi * 8 + vi;
            return globalIndex !== index;
          })
        }));
        return { ...old, pages: newPages };
      });
      if (index === activeIndex && allVideos.length > 1) {
        setTimeout(() => snapToIndex(Math.max(0, activeIndex - 1)), 100);
      }
    },
    onError: () => toast.error("Failed to delete video"),
  });

  const handleDoubleTap = (video, index) => {
    if (!isAuthenticated) return;
    const isLiked = video.likes?.includes(user?._id);
    if (!isLiked) likeMutation.mutate({ videoId: video._id, index });
    setFloatingHearts(prev => ({ ...prev, [video._id]: Date.now() }));
  };

  const handleLike = (video, index) => {
    if (!isAuthenticated) { toast.error("Please login to like videos"); return; }
    likeMutation.mutate({ videoId: video._id, index });
  };

  const handleCommentSubmit = () => {
    if (!isAuthenticated) { toast.error("Please login to comment"); return; }
    if (!commentText.trim()) { toast.error("Please write a comment"); return; }
    commentMutation.mutate({ videoId: commentModal.video._id, text: commentText, index: commentModal.index });
  };

  const handleShareClick = useCallback((video, index) => {
    if (!isAuthenticated) { toast.error("Please login to share"); return; }
    setShareModal({ isOpen: true, video, index });
  }, [isAuthenticated]);

  const getSharePreview = useCallback((video) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const postUrl = `${origin}/post/details/${video._id}`;
    const text = video.description || "Check out this video";
    return { postUrl, text };
  }, []);

  const handleShareToFeed = useCallback(() => {
    if (!shareModal.video) return;
    shareMutation.mutate({ videoId: shareModal.video._id, video: shareModal.video, index: shareModal.index });
  }, [shareModal.video, shareModal.index, shareMutation]);

  const handleShareToMessage = useCallback((friendId) => {
    if (!shareModal.video) return;
    shareToMessageMutation.mutate({ friendId, video: shareModal.video });
  }, [shareModal.video, shareToMessageMutation]);

  const handleCopyLink = useCallback(() => {
    toast.success("Link copied!");
  }, []);

  const handleRepost = useCallback((video, index) => {
    if (!isAuthenticated) { toast.error("Please login to repost"); return; }
    if (repostedPosts[video._id]) {
      toast.error("You already reposted this");
      return;
    }
    repostMutation.mutate({ postId: video._id, index });
  }, [isAuthenticated, repostedPosts, repostMutation]);

  const getTimeAgo = (date) => {
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
            <Link href="/create-post" className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition">
              Create First Video Post
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes floatHeart { 0% { opacity: 0; transform: scale(0.2); } 25% { opacity: 1; transform: scale(1.4); } 65% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0; transform: scale(1.3) translateY(-40px); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .will-change-transform { will-change: transform; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
      `}</style>
      
      <div id="video-wrapper" className="fixed inset-0 bg-black overflow-hidden touch-none select-none">
        <button onClick={() => setIsMuted(p => !p)} className="fixed top-20 right-4 z-50 bg-black/50 rounded-full p-2.5 backdrop-blur-sm active:bg-black/70 transition">
          {isMuted ? <SpeakerXMarkIcon className="h-5 w-5 text-white" /> : <SpeakerWaveIcon className="h-5 w-5 text-white" />}
        </button>
        
        <div ref={containerRef} className="w-full" style={{ transform: "translateY(0px)", willChange: "transform" }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {allVideos.map((video, index) => {
            const isLiked = video.likes?.includes(user?._id) || false;
            const isActive = index === activeIndex;
            const isVideoSaved = savedPosts[video._id] || video.isSaved || false;
            const isVideoInterested = interestedPosts[video._id] || false;
            const isVideoNotInterested = notInterestedPosts[video._id] || false;
            const isVideoReposted = repostedPosts[video._id] || video.isReposted || false;
            
            return (
              <div key={video._id} className="relative bg-black" style={{ height: "100vh", width: "100vw" }}>
                <VideoPlayer video={video} isMuted={isMuted} isActive={isActive} onDoubleTap={() => handleDoubleTap(video, index)} onVideoRef={(ref) => videoRefsMap.current.set(video._id, ref)} />
                {floatingHearts[video._id] && <FloatingHeart onDone={() => setFloatingHearts(p => { const n = { ...p }; delete n[video._id]; return n; })} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                
                {/* Action Buttons */}
                <div className="absolute right-3 bottom-28 sm:bottom-32 flex flex-col items-center gap-5 z-10">
                  <VideoAction
                    icon={isLiked ? <HeartSolidIcon className="h-7 w-7 sm:h-8 sm:w-8 text-red-500" /> : <HeartIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />}
                    count={video.likesCount || 0}
                    onClick={() => handleLike(video, index)}
                    onLongPress={() => setLikesModal({ isOpen: true, video })}
                  />
                  <VideoAction
                    icon={<ChatBubbleLeftIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />}
                    count={video.commentsCount || 0}
                    onClick={() => setCommentModal({ isOpen: true, video, index })}
                  />
                  
                  {/* Repost Button */}
                  <RepostButton
                    count={video.repostsCount || 0}
                    isReposted={isVideoReposted}
                    onClick={() => handleRepost(video, index)}
                  />
                  
                  <VideoAction
                    icon={<ShareIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />}
                    count={video.sharesCount || 0}
                    onClick={() => handleShareClick(video, index)}
                  />
                  
                  {/* Three Dot Menu */}
                  <ThreeDotMenu
                    video={video}
                    index={index}
                    isOwner={video.userId === user?._id}
                    isSaved={isVideoSaved}
                    isInterested={isVideoInterested}
                    isNotInterested={isVideoNotInterested}
                    onSave={() => saveMutation.mutate({ postId: video._id, index })}
                    onInterested={() => interestedMutation.mutate({ postId: video._id })}
                    onNotInterested={() => notInterestedMutation.mutate({ postId: video._id })}
                    onDelete={() => {
                      if (confirm("Are you sure you want to delete this video?")) {
                        deleteVideoMutation.mutate({ postId: video._id, index });
                      }
                    }}
                  />
                </div>
                
                {/* Video Info */}
                <div className="absolute bottom-36 sm:bottom-20 left-3 right-16 z-10">
                  <Link href={`/profile/${video.userId}`}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden ring-2 ring-white/20 flex-shrink-0">
                        {video.userProfilePicture ? (
                          <Image src={video.userProfilePicture} alt={video.userName} width={40} height={40} className="object-cover" loading="lazy" />
                        ) : (<UserIcon className="h-5 w-5 text-white" />)}
                      </div>
                      <span className="font-semibold text-white text-sm sm:text-base drop-shadow">{video.userName}</span>
                    </div>
                  </Link>
                  {video.description && (
                    <p onClick={() => window.location.href = `/post/details/${video._id}`} className="text-white/90 text-xs sm:text-sm mb-1 line-clamp-2 cursor-pointer leading-relaxed drop-shadow">
                      {video.description}
                    </p>
                  )}
                  <p className="text-white/50 text-xs drop-shadow">{getTimeAgo(video.createdAt)}</p>
                </div>
              </div>
            );
          })}
          
          {isFetchingNextPage && (<div className="relative bg-black flex items-center justify-center" style={{ height: "100vh", width: "100vw" }}><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>)}
          {!hasNextPage && allVideos.length > 0 && (
            <div className="relative bg-black flex items-center justify-center" style={{ height: "100vh", width: "100vw" }}>
              <div className="text-center px-6">
                <VideoCameraIcon className="h-16 w-16 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 mb-4">You've seen all videos! 🎉</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-purple-600 rounded-full text-white text-sm hover:bg-purple-700 transition">Watch Again</button>
              </div>
            </div>
          )}
        </div>
        
        {/* Comment Modal */}
        {commentModal.isOpen && (
          <div className="fixed inset-0 bottom-22 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setCommentModal({ isOpen: false, video: null, index: null })}>
            <div className="relative w-full sm:max-w-lg bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Comments</h3>
                <button onClick={() => setCommentModal({ isOpen: false, video: null, index: null })} className="p-1 rounded-full bg-white/10 active:bg-white/20 transition">
                  <XMarkIcon className="h-5 w-5 text-white" />
                </button>
              </div>
              <div className="p-4 border-b border-white/10 flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {commentModal.video?.userProfilePicture ? (
                    <Image src={commentModal.video.userProfilePicture} alt={commentModal.video.userName} width={48} height={48} className="object-cover" loading="lazy" />
                  ) : (<UserIcon className="h-6 w-6 text-white" />)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{commentModal.video?.userName}</p>
                  <p className="text-white/70 text-sm line-clamp-2">{commentModal.video?.description}</p>
                </div>
              </div>
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()} placeholder="Write a comment..." className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500" autoFocus />
                  <button onClick={handleCommentSubmit} disabled={!commentText.trim()} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-sm font-medium disabled:opacity-50 active:scale-95 transition">
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 text-center border-t border-white/10">
                <button onClick={() => { setCommentModal({ isOpen: false, video: null, index: null }); window.location.href = `/post/details/${commentModal.video?._id}`; }} className="text-purple-400 text-sm hover:text-purple-300 transition">
                  View all {commentModal.video?.commentsCount || 0} comments
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
            onClose={() => setShareModal({ isOpen: false, video: null, index: null })}
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