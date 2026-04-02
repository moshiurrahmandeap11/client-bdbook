"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    ChatBubbleLeftIcon,
    HeartIcon,
    PauseIcon,
    PlayIcon,
    ShareIcon,
    UserIcon,
    VideoCameraIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const VideosPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const videoRefs = useRef({});
  const observerRef = useRef(null);

  // Fetch only video posts
  const fetchVideos = async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const response = await axiosInstance.get(`/posts?page=${pageNum}&limit=6`);
      
      if (response.data.success) {
        // Filter only video posts
        const allPosts = response.data.data;
        const videoPosts = allPosts.filter(post => 
          post.media && post.media.resourceType === "video"
        );
        
        if (isLoadMore) {
          setVideos(prev => [...prev, ...videoPosts]);
        } else {
          setVideos(videoPosts);
        }
        
        // Check if there are more videos to load
        setHasMore(videoPosts.length === 6 && allPosts.length === 6);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVideos(1, false);
  }, []);

  // Infinite scroll observer
  const lastVideoElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchVideos(page + 1, true);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, page]);

  // Handle video play/pause
  const handleVideoPlay = (videoId) => {
    // Pause previously playing video
    if (playingVideoId && playingVideoId !== videoId) {
      const prevVideo = videoRefs.current[playingVideoId];
      if (prevVideo) {
        prevVideo.pause();
      }
    }
    setPlayingVideoId(videoId);
  };

  const handleVideoPause = () => {
    setPlayingVideoId(null);
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
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
      }
    }
    return "just now";
  };

  const goToPostDetails = (postId) => {
    window.location.href = `/post/details/${postId}`;
  };

  if (loading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent flex items-center gap-3">
            <VideoCameraIcon className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400" />
            Videos
          </h1>
          <p className="text-white/60 mt-2">Watch and discover amazing videos</p>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-12 text-center">
            <VideoCameraIcon className="h-20 w-20 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No videos yet</p>
            {isAuthenticated && (
              <Link
                href="/posts"
                className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
              >
                Create First Video Post
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => {
              const VideoCardComponent = () => (
                <VideoCard 
                  video={video}
                  videoRefs={videoRefs}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  isPlaying={playingVideoId === video._id}
                  getTimeAgo={getTimeAgo}
                  goToPostDetails={goToPostDetails}
                />
              );
              
              if (index === videos.length - 1) {
                return (
                  <div key={video._id} ref={lastVideoElementRef}>
                    <VideoCardComponent />
                  </div>
                );
              } else {
                return (
                  <div key={video._id}>
                    <VideoCardComponent />
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* No more videos message */}
        {!hasMore && videos.length > 0 && (
          <div className="text-center py-8">
            <p className="text-white/40 text-sm">You've seen all videos! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Video Card Component
const VideoCard = ({ video, videoRefs, onPlay, onPause, isPlaying, getTimeAgo, goToPostDetails }) => {
  const { user, isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(video.likes?.includes(user?._id) || false);
  const [likeCount, setLikeCount] = useState(video.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);

  // Update like state when video prop changes
  useEffect(() => {
    setIsLiked(video.likes?.includes(user?._id) || false);
    setLikeCount(video.likesCount || 0);
  }, [video.likes, video.likesCount, user?._id]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to like videos");
      return;
    }
    
    if (isLiking) return;
    
    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    
    try {
      const response = await axiosInstance.post(`/posts/${video._id}/like`);
      if (response.data.success) {
        const freshResponse = await axiosInstance.get(`/posts/${video._id}`);
        if (freshResponse.data.success) {
          setIsLiked(freshResponse.data.data.likes?.includes(user?._id));
          setLikeCount(freshResponse.data.data.likesCount || 0);
        }
      }
    } catch (error) {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      toast.error("Failed to process like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleVideoClick = (e) => {
    e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    if (videoEl.paused) {
      videoEl.play()
        .then(() => {
          onPlay(video._id);
        })
        .catch((error) => {
          console.error("Error playing video:", error);
        });
    } else {
      videoEl.pause();
      onPause();
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden hover:bg-white/10 transition-all duration-300 group">
      {/* Video Container */}
      <div 
        className="relative bg-black/50 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <video
          ref={videoRef}
          src={video.media?.url}
          className="w-full aspect-video object-contain"
          poster={video.media?.thumbnail || ""}
          onClick={handleVideoClick}
          onPlay={() => onPlay(video._id)}
          onPause={onPause}
          loop={false}
          playsInline
          preload="metadata"
          controls={isHovered}
          controlsList="nodownload"
        />
        
        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <PlayIcon className="h-16 w-16 text-white drop-shadow-lg" />
          </div>
        )}
        {isPlaying && isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <PauseIcon className="h-16 w-16 text-white drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4">
        {/* User Info */}
        <div className="flex items-start gap-3 mb-3">
          <Link href={`/profile/${video.userId}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0">
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
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${video.userId}`}>
              <h3 className="font-semibold text-white hover:text-purple-400 transition text-sm sm:text-base truncate">
                {video.userName}
              </h3>
            </Link>
            <p className="text-white/40 text-xs">{getTimeAgo(video.createdAt)}</p>
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <p 
            onClick={() => goToPostDetails(video._id)}
            className="text-white/80 text-sm mb-3 line-clamp-2 cursor-pointer hover:text-white/90 transition"
          >
            {video.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-around gap-2 pt-3 border-t border-white/10">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center gap-1.5 text-white/60 hover:text-red-400 transition-colors disabled:opacity-50 py-1.5 px-3 rounded-lg hover:bg-white/5"
          >
            {isLiked ? (
              <HeartSolidIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5" />
            )}
            <span className="text-xs font-medium">{likeCount}</span>
          </button>
          
          <button
            onClick={() => goToPostDetails(video._id)}
            className="flex items-center gap-1.5 text-white/60 hover:text-purple-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
          >
            <ChatBubbleLeftIcon className="h-5 w-5" />
            <span className="text-xs font-medium">{video.commentsCount || 0}</span>
          </button>
          
          <button
            onClick={() => goToPostDetails(video._id)}
            className="flex items-center gap-1.5 text-white/60 hover:text-green-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
          >
            <ShareIcon className="h-5 w-5" />
            <span className="text-xs font-medium">{video.sharesCount || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideosPage;