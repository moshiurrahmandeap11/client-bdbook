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
  XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

// Video Action Component
const VideoAction = ({ icon, count, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
    >
      <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-white text-xs font-medium">{count || 0}</span>
    </button>
  );
};

// Video Player Component
const VideoPlayer = ({ video, isMuted, isActive }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // Play/pause based on isActive prop
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      videoElement.play().catch(() => {});
    } else {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  }, [isActive]);

  // Sync mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const progressPercent = (videoElement.currentTime / videoElement.duration) * 100;
      setProgress(progressPercent);
    };
    const handleLoadedMetadata = () => setDuration(videoElement.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);

    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setProgress(percentage * 100);
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="absolute inset-0 w-full h-full"
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
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
        onClick={togglePlay}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={togglePlay}
        >
          <PlayIcon className="h-16 w-16 text-white drop-shadow-lg" />
        </div>
      )}

      {/* Video Controls */}
      {(showControls || !isPlaying) && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-2"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-purple-500 rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full opacity-0 hover:opacity-100 transition" />
            </div>
          </div>
          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-purple-400 transition">
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
              </button>
              <span className="text-white text-xs">
                {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Video Skeleton
const VideoSkeleton = () => (
  <div className="relative h-screen w-full bg-black flex items-center justify-center flex-shrink-0">
    <div className="animate-pulse flex flex-col items-center">
      <div className="w-20 h-20 rounded-full bg-white/10 mb-4"></div>
      <div className="h-4 bg-white/10 rounded w-32 mb-2"></div>
      <div className="h-3 bg-white/10 rounded w-24"></div>
    </div>
  </div>
);

const VideosPage = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isMuted, setIsMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentModal, setCommentModal] = useState({ isOpen: false, video: null, index: null });
  const [commentText, setCommentText] = useState("");

  const containerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Touch/drag state
  const dragStartY = useRef(null);
  const isDragging = useRef(false);
  const currentTranslate = useRef(0);
  const animationRef = useRef(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["videos"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosInstance.get(`/posts?page=${pageParam}&limit=10`);
      if (response.data.success) {
        const allPosts = response.data.data;
        const videoPosts = allPosts.filter(
          (post) => post.media && post.media.resourceType === "video"
        );
        return { data: videoPosts, pagination: response.data.pagination };
      }
      return { data: [], pagination: { page: 1, pages: 1 } };
    },
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const allVideos = data?.pages.flatMap((page) => page.data) || [];

  // Snap to index
  const snapToIndex = useCallback((index) => {
    const container = containerRef.current;
    if (!container) return;
    const clampedIndex = Math.max(0, Math.min(index, allVideos.length - 1));
    container.style.transition = "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    container.style.transform = `translateY(-${clampedIndex * 100}vh)`;
    setActiveIndex(clampedIndex);

    // Load more if near end
    if (clampedIndex >= allVideos.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [allVideos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    dragStartY.current = e.clientY;
    isDragging.current = true;
    if (containerRef.current) {
      containerRef.current.style.transition = "none";
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const diff = e.clientY - dragStartY.current;
    const baseTranslate = -activeIndex * window.innerHeight;
    currentTranslate.current = baseTranslate + diff;
    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${currentTranslate.current}px)`;
    }
  };

  const handleMouseUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = e.clientY - dragStartY.current;
    dragStartY.current = null;

    if (diff < -80 && activeIndex < allVideos.length - 1) {
      snapToIndex(activeIndex + 1);
    } else if (diff > 80 && activeIndex > 0) {
      snapToIndex(activeIndex - 1);
    } else {
      snapToIndex(activeIndex);
    }
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    if (containerRef.current) {
      containerRef.current.style.transition = "none";
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    const baseTranslate = -activeIndex * window.innerHeight;
    currentTranslate.current = baseTranslate + diff;
    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${currentTranslate.current}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = e.changedTouches[0].clientY - dragStartY.current;
    dragStartY.current = null;

    if (diff < -80 && activeIndex < allVideos.length - 1) {
      snapToIndex(activeIndex + 1);
    } else if (diff > 80 && activeIndex > 0) {
      snapToIndex(activeIndex - 1);
    } else {
      snapToIndex(activeIndex);
    }
  };

  // Mouse wheel scroll
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY > 30 && activeIndex < allVideos.length - 1) {
      snapToIndex(activeIndex + 1);
    } else if (e.deltaY < -30 && activeIndex > 0) {
      snapToIndex(activeIndex - 1);
    }
  }, [activeIndex, allVideos.length, snapToIndex]);

  useEffect(() => {
    const wrapper = document.getElementById("video-wrapper");
    if (!wrapper) return;
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ videoId }) => {
      const response = await axiosInstance.post(`/posts/${videoId}/like`);
      return response.data;
    },
    onMutate: async ({ videoId, index }) => {
      await queryClient.cancelQueries({ queryKey: ["videos"] });
      const previousData = queryClient.getQueryData(["videos"]);
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pageIdx) => ({
            ...page,
            data: page.data.map((video, videoIdx) => {
              if (pageIdx === Math.floor(index / 10) && videoIdx === index % 10) {
                const isCurrentlyLiked = video.likes?.includes(user?._id);
                return {
                  ...video,
                  likesCount: isCurrentlyLiked
                    ? (video.likesCount || 0) - 1
                    : (video.likesCount || 0) + 1,
                  likes: isCurrentlyLiked
                    ? video.likes?.filter((id) => id !== user?._id) || []
                    : [...(video.likes || []), user?._id],
                };
              }
              return video;
            }),
          })),
        };
      });
      return { previousData };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["videos"], context.previousData);
      toast.error("Failed to like video");
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ videoId, text }) => {
      const response = await axiosInstance.post(`/posts/${videoId}/comment`, { text });
      return response.data;
    },
    onSuccess: (_, { index }) => {
      queryClient.setQueryData(["videos"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pageIdx) => ({
            ...page,
            data: page.data.map((video, videoIdx) => {
              if (pageIdx === Math.floor(index / 10) && videoIdx === index % 10) {
                return { ...video, commentsCount: (video.commentsCount || 0) + 1 };
              }
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

  const toggleMute = () => setIsMuted((prev) => !prev);

  const handleLike = (video, index) => {
    if (!isAuthenticated) {
      toast.error("Please login to like videos");
      return;
    }
    likeMutation.mutate({ videoId: video._id, index });
  };

  const handleCommentSubmit = () => {
    if (!isAuthenticated) {
      toast.error("Please login to comment");
      return;
    }
    if (!commentText.trim()) {
      toast.error("Please write a comment");
      return;
    }
    commentMutation.mutate({
      videoId: commentModal.video._id,
      text: commentText,
      index: commentModal.index,
    });
  };

  const goToPostDetails = (postId) => {
    window.location.href = `/post/details/${postId}`;
  };

  const getTimeAgo = (date) => {
    if (!date) return "recently";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
    return "just now";
  };

  if (isLoading && allVideos.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        {[...Array(3)].map((_, i) => (
          <VideoSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (allVideos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <VideoCameraIcon className="h-20 w-20 text-white/30 mx-auto mb-4" />
          <p className="text-white/60 text-lg">No videos yet</p>
          {isAuthenticated && (
            <Link
              href="/create-post"
              className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
            >
              Create First Video Post
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="video-wrapper" className="fixed inset-0 bg-black overflow-hidden">
      {/* Mute/Unmute Button */}
      <button
        onClick={toggleMute}
        className="fixed top-20 right-4 z-50 bg-black/50 rounded-full p-2 backdrop-blur-sm hover:bg-black/70 transition"
      >
        {isMuted ? (
          <SpeakerXMarkIcon className="h-5 w-5 text-white" />
        ) : (
          <SpeakerWaveIcon className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Slide Indicator dots */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
        {allVideos.slice(0, 10).map((_, i) => (
          <button
            key={i}
            onClick={() => snapToIndex(i)}
            className={`w-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? "h-6 bg-purple-500" : "h-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Draggable Container */}
      <div
        ref={containerRef}
        className="w-full"
        style={{
          transform: `translateY(0px)`,
          willChange: "transform",
          cursor: isDragging.current ? "grabbing" : "grab",
        }}
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
              style={{ height: "100vh", width: "100vw", flexShrink: 0 }}
            >
              {/* Video Player */}
              <VideoPlayer
                video={video}
                isMuted={isMuted}
                isActive={isActive}
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Right Side Actions */}
              <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
                <VideoAction
                  icon={
                    isLiked ? (
                      <HeartSolidIcon className="h-8 w-8 text-red-500" />
                    ) : (
                      <HeartIcon className="h-8 w-8 text-white" />
                    )
                  }
                  count={video.likesCount || 0}
                  onClick={() => handleLike(video, index)}
                />
                <VideoAction
                  icon={<ChatBubbleLeftIcon className="h-8 w-8 text-white" />}
                  count={video.commentsCount || 0}
                  onClick={() =>
                    setCommentModal({ isOpen: true, video, index })
                  }
                />
                <VideoAction
                  icon={<ShareIcon className="h-8 w-8 text-white" />}
                  count={video.sharesCount || 0}
                  onClick={() => goToPostDetails(video._id)}
                />
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-6 left-4 right-20 z-10">
                <Link href={`/profile/${video.userId}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
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
                    <h3 className="font-semibold text-white text-base">
                      {video.userName}
                    </h3>
                  </div>
                </Link>
                {video.description && (
                  <p
                    onClick={() => goToPostDetails(video._id)}
                    className="text-white text-sm mb-2 line-clamp-2 cursor-pointer hover:text-white/80"
                  >
                    {video.description}
                  </p>
                )}
                <p className="text-white/50 text-xs">{getTimeAgo(video.createdAt)}</p>
              </div>
            </div>
          );
        })}

        {/* Loading more */}
        {isFetchingNextPage && (
          <div
            className="relative bg-black flex items-center justify-center"
            style={{ height: "100vh", width: "100vw" }}
          >
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* No more videos */}
        {!hasNextPage && allVideos.length > 0 && (
          <div
            className="relative bg-black flex items-center justify-center"
            style={{ height: "100vh", width: "100vw" }}
          >
            <div className="text-center">
              <VideoCameraIcon className="h-16 w-16 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">You&apos;ve seen all videos! 🎉</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-purple-600 rounded-full text-white text-sm hover:bg-purple-700 transition"
              >
                Watch Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {commentModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setCommentModal({ isOpen: false, video: null, index: null })}
        >
          <div
            className="relative w-full sm:max-w-lg bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-t-2xl sm:rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Comments</h3>
              <button
                onClick={() =>
                  setCommentModal({ isOpen: false, video: null, index: null })
                }
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>
            {/* Video Info */}
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
            {/* Comment Input */}
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
            {/* View All Comments */}
            <div className="p-4 text-center border-t border-white/10">
              <button
                onClick={() => {
                  setCommentModal({ isOpen: false, video: null, index: null });
                  goToPostDetails(commentModal.video?._id);
                }}
                className="text-purple-400 text-sm hover:text-purple-300 transition"
              >
                View all {commentModal.video?.commentsCount || 0} comments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideosPage;