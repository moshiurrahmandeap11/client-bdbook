"use client";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  ChatBubbleLeftIcon,
  HeartIcon,
  PaperAirplaneIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  UserIcon,
  VideoCameraIcon,
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
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

// ─── Video Action Button ───────────────────────────────────────────────────────
const VideoAction = ({ icon, count, onClick, onLongPress }) => {
  const timer = useRef(null);
  const fired = useRef(false);

  const start = () => {
    fired.current = false;
    if (onLongPress) {
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, 500);
    }
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const handleClick = () => {
    if (!fired.current) onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={start}
      onTouchEnd={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      className="flex flex-col items-center gap-1 group select-none"
    >
      <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 group-active:scale-90 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-white text-xs font-medium drop-shadow">{count || 0}</span>
    </button>
  );
};

// ─── Floating Heart ────────────────────────────────────────────────────────────
const FloatingHeart = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
      <HeartSolidIcon
        className="h-28 w-28 text-red-500 drop-shadow-2xl"
        style={{ animation: "floatHeart 0.9s ease forwards" }}
      />
    </div>
  );
};

// ─── Likes Modal ───────────────────────────────────────────────────────────────
const LikesModal = ({ video, onClose }) => {
  // Try dedicated endpoint; fallback to likes array already in video object
  const { data: fetchedLikes, isLoading } = useQuery({
    queryKey: ["likes", video._id],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(`/posts/${video._id}/likes`);
        if (res.data.success && Array.isArray(res.data.data)) return res.data.data;
      } catch {
        // ignore — use fallback
      }
      return null; // triggers fallback
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  // Fallback: build list from video.likes ids (no profile pictures)
  const likes =
    fetchedLikes ??
    (video.likes || []).map((id) => ({
      _id: id,
      name: id === video.userId ? video.userName : "User",
      profilePicture: id === video.userId ? video.userProfilePicture : null,
    }));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <HeartSolidIcon className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white">
              Reactions{" "}
              <span className="text-white/50 text-base font-normal">
                ({video.likesCount || likes.length})
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
            </div>
          ) : likes.length === 0 ? (
            <div className="text-center py-12">
              <HeartIcon className="h-12 w-12 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No reactions yet</p>
            </div>
          ) : (
            likes.map((person, i) => (
              <div
                key={person._id || i}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {person.profilePicture ? (
                    <Image
                      src={person.profilePicture}
                      alt={person.name || "User"}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {person.name || person.userName || "User"}
                  </p>
                  {person.username && (
                    <p className="text-white/50 text-xs truncate">@{person.username}</p>
                  )}
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

// ─── Video Player ──────────────────────────────────────────────────────────────
const VideoPlayer = ({ video, isMuted, isActive, onDoubleTap }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const ctrlTimer = useRef(null);
  const lastTap = useRef(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
      setProgress(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setProgress((el.currentTime / el.duration) * 100 || 0);
    const onMeta = () => setDuration(el.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    el.paused ? el.play() : el.pause();
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      onDoubleTap?.();
    } else {
      togglePlay();
    }
    lastTap.current = now;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) {
      videoRef.current.currentTime = pct * duration;
      setProgress(pct * 100);
    }
  };

  const showCtrl = () => {
    setShowControls(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div
      className="absolute inset-0 w-full h-full"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <video
        ref={videoRef}
        src={video.media?.url}
        className="w-full h-full object-contain"
        poster={video.media?.thumbnail || ""}
        loop={false}
        muted={isMuted}
        playsInline
        preload="auto"
        onClick={handleTap}
      />

      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={handleTap}
        >
          <PlayIcon className="h-16 w-16 text-white drop-shadow-lg opacity-90" />
        </div>
      )}

      {(showControls || !isPlaying) && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Seek bar */}
          <div
            className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-3 relative"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow -translate-x-0" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-purple-400 transition"
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5" />
              ) : (
                <PlayIcon className="h-5 w-5" />
              )}
            </button>
            <span className="text-white text-xs">
              {fmt(videoRef.current?.currentTime)} / {fmt(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const VideoSkeleton = () => (
  <div
    className="relative bg-black flex items-center justify-center"
    style={{ height: "100vh", width: "100vw" }}
  >
    <div className="animate-pulse flex flex-col items-center">
      <div className="w-20 h-20 rounded-full bg-white/10 mb-4" />
      <div className="h-4 bg-white/10 rounded w-32 mb-2" />
      <div className="h-3 bg-white/10 rounded w-24" />
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const VideosPage = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [isMuted, setIsMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentModal, setCommentModal] = useState({ isOpen: false, video: null, index: null });
  const [likesModal, setLikesModal] = useState({ isOpen: false, video: null });
  const [commentText, setCommentText] = useState("");
  const [floatingHearts, setFloatingHearts] = useState({});

  const containerRef = useRef(null);
  const activeIndexRef = useRef(0); // always in sync for event handlers
  const dragStartY = useRef(null);
  const dragStartTime = useRef(null);
  const isDragging = useRef(false);
  const lastWheelTime = useRef(0);
  const isSnapping = useRef(false);

  // ── Infinite query with aggressive caching ──
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["videos"],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await axiosInstance.get(`/posts?page=${pageParam}&limit=10`);
        if (res.data.success) {
          return {
            data: res.data.data.filter((p) => p.media?.resourceType === "video"),
            pagination: res.data.pagination,
          };
        }
        return { data: [], pagination: { page: 1, pages: 1 } };
      },
      getNextPageParam: (last) =>
        last.pagination.page < last.pagination.pages
          ? last.pagination.page + 1
          : undefined,
      staleTime: 15 * 60 * 1000,   // 15 min — don't refetch unless stale
      gcTime: 30 * 60 * 1000,       // 30 min in memory
      refetchOnWindowFocus: false,
      refetchOnMount: false,        // use cache if available
      refetchOnReconnect: false,
    });

  const allVideos = data?.pages.flatMap((p) => p.data) || [];

  // Keep ref in sync
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // ── Snap ──
  const snapToIndex = useCallback(
    (index, fast = false) => {
      if (isSnapping.current) return;
      const container = containerRef.current;
      if (!container) return;
      const total = allVideos.length + (isFetchingNextPage ? 1 : 0);
      const clamped = Math.max(0, Math.min(index, total - 1));
      const dur = fast ? "0.18s" : "0.26s";
      container.style.transition = `transform ${dur} cubic-bezier(0.22, 1, 0.36, 1)`;
      container.style.transform = `translateY(-${clamped * 100}vh)`;
      setActiveIndex(clamped);
      activeIndexRef.current = clamped;

      isSnapping.current = true;
      setTimeout(() => { isSnapping.current = false; }, fast ? 200 : 300);

      if (clamped >= allVideos.length - 2 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [allVideos.length, hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // ── Touch handlers (velocity-based) ──
  const handleTouchStart = useCallback((e) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    isDragging.current = true;
    if (containerRef.current) containerRef.current.style.transition = "none";
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    const base = -activeIndexRef.current * window.innerHeight;
    // Rubber-band resistance at edges
    const idx = activeIndexRef.current;
    const atTop = idx === 0 && diff > 0;
    const atBottom = idx >= allVideos.length - 1 && diff < 0;
    const resistance = atTop || atBottom ? 0.25 : 1;
    if (containerRef.current)
      containerRef.current.style.transform = `translateY(${base + diff * resistance}px)`;
  }, [allVideos.length]);

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = e.changedTouches[0].clientY - dragStartY.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = Math.abs(diff) / elapsed; // px/ms
    dragStartY.current = null;

    const cur = activeIndexRef.current;
    // Fast flick (velocity > 0.3) → change immediately even with small diff
    // Slow drag → need 40px threshold
    const shouldChange = velocity > 0.3 || Math.abs(diff) > 40;

    if (shouldChange && diff < 0 && cur < allVideos.length - 1) {
      snapToIndex(cur + 1, velocity > 0.6);
    } else if (shouldChange && diff > 0 && cur > 0) {
      snapToIndex(cur - 1, velocity > 0.6);
    } else {
      snapToIndex(cur);
    }
  }, [allVideos.length, snapToIndex]);

  // ── Mouse drag ──
  const handleMouseDown = useCallback((e) => {
    dragStartY.current = e.clientY;
    dragStartTime.current = Date.now();
    isDragging.current = true;
    if (containerRef.current) containerRef.current.style.transition = "none";
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const diff = e.clientY - dragStartY.current;
    const base = -activeIndexRef.current * window.innerHeight;
    if (containerRef.current)
      containerRef.current.style.transform = `translateY(${base + diff}px)`;
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = e.clientY - dragStartY.current;
    dragStartY.current = null;
    const cur = activeIndexRef.current;
    if (diff < -60 && cur < allVideos.length - 1) snapToIndex(cur + 1);
    else if (diff > 60 && cur > 0) snapToIndex(cur - 1);
    else snapToIndex(cur);
  }, [allVideos.length, snapToIndex]);

  // ── Wheel (throttled + velocity) ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheelTime.current < 500) return;
    lastWheelTime.current = now;
    const cur = activeIndexRef.current;
    if (e.deltaY > 0 && cur < allVideos.length - 1) snapToIndex(cur + 1);
    else if (e.deltaY < 0 && cur > 0) snapToIndex(cur - 1);
  }, [allVideos.length, snapToIndex]);

  useEffect(() => {
    const wrapper = document.getElementById("video-wrapper");
    if (!wrapper) return;
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Like mutation ──
  const likeMutation = useMutation({
    mutationFn: async ({ videoId }) => {
      const res = await axiosInstance.post(`/posts/${videoId}/like`);
      return res.data;
    },
    onMutate: async ({ videoId, index }) => {
      await queryClient.cancelQueries({ queryKey: ["videos"] });
      const prev = queryClient.getQueryData(["videos"]);
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pi) => ({
            ...page,
            data: page.data.map((video, vi) => {
              if (pi === Math.floor(index / 10) && vi === index % 10) {
                const liked = video.likes?.includes(user?._id);
                return {
                  ...video,
                  likesCount: liked
                    ? (video.likesCount || 0) - 1
                    : (video.likesCount || 0) + 1,
                  likes: liked
                    ? video.likes.filter((id) => id !== user?._id)
                    : [...(video.likes || []), user?._id],
                };
              }
              return video;
            }),
          })),
        };
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(["videos"], ctx.prev);
      toast.error("Failed to like video");
    },
  });

  // ── Comment mutation ──
  const commentMutation = useMutation({
    mutationFn: async ({ videoId, text }) => {
      const res = await axiosInstance.post(`/posts/${videoId}/comment`, { text });
      return res.data;
    },
    onSuccess: (_, { index }) => {
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pi) => ({
            ...page,
            data: page.data.map((video, vi) => {
              if (pi === Math.floor(index / 10) && vi === index % 10)
                return { ...video, commentsCount: (video.commentsCount || 0) + 1 };
              return video;
            }),
          })),
        };
      });
      setCommentText("");
      setCommentModal({ isOpen: false, video: null, index: null });
      toast.success("Comment added!");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  // ── Helpers ──
  const handleDoubleTap = (video, index) => {
    if (!isAuthenticated) return;
    const isLiked = video.likes?.includes(user?._id);
    if (!isLiked) likeMutation.mutate({ videoId: video._id, index });
    setFloatingHearts((prev) => ({ ...prev, [video._id]: Date.now() }));
  };

  const handleLike = (video, index) => {
    if (!isAuthenticated) { toast.error("Please login to like videos"); return; }
    likeMutation.mutate({ videoId: video._id, index });
  };

  const handleCommentSubmit = () => {
    if (!isAuthenticated) { toast.error("Please login to comment"); return; }
    if (!commentText.trim()) { toast.error("Please write a comment"); return; }
    commentMutation.mutate({
      videoId: commentModal.video._id,
      text: commentText,
      index: commentModal.index,
    });
  };

  const getTimeAgo = (date) => {
    if (!date) return "recently";
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    for (const [u, sec] of Object.entries({
      year: 31536000, month: 2592000, week: 604800,
      day: 86400, hour: 3600, minute: 60,
    })) {
      const i = Math.floor(s / sec);
      if (i >= 1) return `${i} ${u}${i === 1 ? "" : "s"} ago`;
    }
    return "just now";
  };

  // ── States ──
  if (isLoading && allVideos.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        {[...Array(3)].map((_, i) => <VideoSkeleton key={i} />)}
      </div>
    );
  }

  if (!isLoading && allVideos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <VideoCameraIcon className="h-20 w-20 text-white/30 mx-auto mb-4" />
          <p className="text-white/60 text-lg mb-4">No videos yet</p>
          {isAuthenticated && (
            <Link
              href="/create-post"
              className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
            >
              Create First Video Post
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <>
      <style>{`
        @keyframes floatHeart {
          0%   { opacity: 0; transform: scale(0.2); }
          25%  { opacity: 1; transform: scale(1.4); }
          65%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.3) translateY(-40px); }
        }
      `}</style>

      <div
        id="video-wrapper"
        className="fixed inset-0 bg-black overflow-hidden touch-none select-none"
      >
        {/* Mute */}
        <button
          onClick={() => setIsMuted((p) => !p)}
          className="fixed top-20 right-4 z-50 bg-black/50 rounded-full p-2.5 backdrop-blur-sm hover:bg-black/70 transition"
        >
          {isMuted
            ? <SpeakerXMarkIcon className="h-5 w-5 text-white" />
            : <SpeakerWaveIcon className="h-5 w-5 text-white" />}
        </button>

        {/* Dot indicators */}
        <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
          {allVideos.slice(0, 12).map((_, i) => (
            <button
              key={i}
              onClick={() => snapToIndex(i)}
              className={`w-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "h-6 bg-purple-500" : "h-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Draggable container */}
        <div
          ref={containerRef}
          className="w-full"
          style={{ transform: "translateY(0px)", willChange: "transform" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {allVideos.map((video, index) => {
            const isLiked = video.likes?.includes(user?._id) || false;
            const isActive = index === activeIndex;

            return (
              <div
                key={video._id}
                className="relative bg-black"
                style={{ height: "100vh", width: "100vw" }}
              >
                <VideoPlayer
                  video={video}
                  isMuted={isMuted}
                  isActive={isActive}
                  onDoubleTap={() => handleDoubleTap(video, index)}
                />

                {floatingHearts[video._id] && (
                  <FloatingHeart
                    onDone={() =>
                      setFloatingHearts((p) => {
                        const n = { ...p };
                        delete n[video._id];
                        return n;
                      })
                    }
                  />
                )}

                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 pointer-events-none" />

                {/* Right actions */}
                <div className="absolute right-3 bottom-28 sm:bottom-32 flex flex-col items-center gap-5 z-10">
                  <VideoAction
                    icon={
                      isLiked
                        ? <HeartSolidIcon className="h-7 w-7 sm:h-8 sm:w-8 text-red-500" />
                        : <HeartIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    }
                    count={video.likesCount || 0}
                    onClick={() => handleLike(video, index)}
                    onLongPress={() => setLikesModal({ isOpen: true, video })}
                  />
                  <VideoAction
                    icon={<ChatBubbleLeftIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />}
                    count={video.commentsCount || 0}
                    onClick={() => setCommentModal({ isOpen: true, video, index })}
                  />
                  <VideoAction
                    icon={<ShareIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />}
                    count={video.sharesCount || 0}
                    onClick={() => { window.location.href = `/post/details/${video._id}`; }}
                  />
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-14 sm:bottom-16 left-3 right-16 z-10">
                  <Link href={`/profile/${video.userId}`}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden ring-2 ring-white/20 flex-shrink-0">
                        {video.userProfilePicture ? (
                          <Image
                            src={video.userProfilePicture}
                            alt={video.userName}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <UserIcon className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <span className="font-semibold text-white text-sm sm:text-base drop-shadow">
                        {video.userName}
                      </span>
                    </div>
                  </Link>
                  {video.description && (
                    <p
                      onClick={() => { window.location.href = `/post/details/${video._id}`; }}
                      className="text-white/90 text-xs sm:text-sm mb-1.5 line-clamp-2 cursor-pointer leading-relaxed drop-shadow"
                    >
                      {video.description}
                    </p>
                  )}
                  <p className="text-white/50 text-xs drop-shadow">
                    {getTimeAgo(video.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Loading next */}
          {isFetchingNextPage && (
            <div
              className="relative bg-black flex items-center justify-center"
              style={{ height: "100vh", width: "100vw" }}
            >
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
            </div>
          )}

          {/* End */}
          {!hasNextPage && allVideos.length > 0 && (
            <div
              className="relative bg-black flex items-center justify-center"
              style={{ height: "100vh", width: "100vw" }}
            >
              <div className="text-center px-6">
                <VideoCameraIcon className="h-16 w-16 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 mb-4">You&apos;ve seen all videos! 🎉</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-purple-600 rounded-full text-white text-sm hover:bg-purple-700 transition"
                >
                  Watch Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Comment Modal ── */}
        {commentModal.isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setCommentModal({ isOpen: false, video: null, index: null })}
          >
            <div
              className="relative w-full sm:max-w-lg bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-t-2xl sm:rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Comments</h3>
                <button
                  onClick={() => setCommentModal({ isOpen: false, video: null, index: null })}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <XMarkIcon className="h-5 w-5 text-white" />
                </button>
              </div>
              <div className="p-4 border-b border-white/10 flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {commentModal.video?.userProfilePicture ? (
                    <Image
                      src={commentModal.video.userProfilePicture}
                      alt={commentModal.video.userName}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{commentModal.video?.userName}</p>
                  <p className="text-white/70 text-sm line-clamp-2">
                    {commentModal.video?.description}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
                    placeholder="Write a comment..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!commentText.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-sm font-medium disabled:opacity-50 hover:scale-105 transition-transform"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 text-center border-t border-white/10">
                <button
                  onClick={() => {
                    setCommentModal({ isOpen: false, video: null, index: null });
                    window.location.href = `/post/details/${commentModal.video?._id}`;
                  }}
                  className="text-purple-400 text-sm hover:text-purple-300 transition"
                >
                  View all {commentModal.video?.commentsCount || 0} comments
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Likes Modal ── */}
        {likesModal.isOpen && likesModal.video && (
          <LikesModal
            video={likesModal.video}
            onClose={() => setLikesModal({ isOpen: false, video: null })}
          />
        )}
      </div>
    </>
  );
};

export default VideosPage;