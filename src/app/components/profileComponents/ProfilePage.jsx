"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  BookmarkIcon,
  CalendarIcon,
  CameraIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ClockIcon,
  DocumentTextIcon,
  HeartIcon,
  LinkIcon,
  MapPinIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  ShareIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
  VideoCameraIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheckIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import PostCard from "../sharedComponents/PostCard/PostCard";

// ==================== SKELETON COMPONENTS ====================

const ProfileHeaderSkeleton = () => (
  <div className="relative mb-20 animate-pulse">
    <div className="h-48 sm:h-64 rounded-2xl bg-white/10" />
    <div className="absolute -bottom-12 left-6">
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/20 bg-white/10" />
    </div>
  </div>
);

const ProfileInfoSkeleton = () => (
  <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-6 mb-6 animate-pulse">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex-1">
        <div className="h-8 bg-white/20 rounded w-48 mb-2" />
        <div className="h-4 bg-white/20 rounded w-32 mb-3" />
        <div className="h-16 bg-white/20 rounded w-full max-w-md mb-4" />
        <div className="flex gap-4">
          <div className="h-4 bg-white/20 rounded w-24" />
          <div className="h-4 bg-white/20 rounded w-32" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-white/20 rounded-xl w-28" />
        <div className="h-10 bg-white/20 rounded-xl w-28" />
      </div>
    </div>
    <div className="flex gap-6 mt-6 pt-4 border-t border-white/10">
      <div className="h-12 bg-white/20 rounded w-16" />
      <div className="h-12 bg-white/20 rounded w-16" />
      <div className="h-12 bg-white/20 rounded w-16" />
      <div className="h-12 bg-white/20 rounded w-16" />
    </div>
  </div>
);

const TabsSkeleton = () => (
  <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden animate-pulse">
    <div className="flex border-b border-white/10">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex-1 h-12 bg-white/10" />
      ))}
    </div>
    <div className="p-4 sm:p-6">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

// ==================== FRIENDS MODAL ====================
const FriendsModal = ({ isOpen, onClose, userId, isOwner }) => {
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/users/friends/${userId}`);
      if (response.data.success) {
        setFriends(response.data.data);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const removeFriendMutation = useMutation({
    mutationFn: async (friendId) => {
      const response = await axiosInstance.delete(`/users/friends/${friendId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Friend removed");
      fetchFriends();
      queryClient.invalidateQueries({ queryKey: ["friends-count", userId] });
    },
    onError: () => toast.error("Failed to remove friend"),
  });

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen, fetchFriends]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Friends ({friends.length})</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition">
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">No friends yet</p>
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                <Link href={`/profile/${friend._id}`} onClick={onClose} className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {friend.profilePicture?.url ? (
                      <Image src={friend.profilePicture.url} alt={friend.fullName} width={48} height={48} className="object-cover" />
                    ) : (
                      <UserIcon className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{friend.fullName}</p>
                    <p className="text-white/50 text-xs truncate">@{friend.email?.split("@")[0]}</p>
                  </div>
                </Link>
                {isOwner && (
                  <button
                    onClick={() => removeFriendMutation.mutate(friend._id)}
                    className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                  >
                    <UserMinusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== FOLLOWERS MODAL ====================
const FollowersModal = ({ isOpen, onClose, userId, isOwner, currentUserId }) => {
  const [followers, setFollowers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchFollowers = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/users/followers/${userId}`);
      if (response.data.success) {
        setFollowers(response.data.data);
      } else {
        setFollowers([]);
      }
    } catch (error) {
      console.error("Failed to fetch followers:", error);
      setFollowers([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      const response = await axiosInstance.post(`/users/friend-request/accept/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Friend request accepted");
      fetchFollowers();
      queryClient.invalidateQueries({ queryKey: ["followers-count", userId] });
      queryClient.invalidateQueries({ queryKey: ["friends-count", userId] });
    },
    onError: () => toast.error("Failed to accept request"),
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (targetUserId) => {
      const response = await axiosInstance.post(`/users/friend-request/${targetUserId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Friend request sent");
      fetchFollowers();
    },
    onError: () => toast.error("Failed to send request"),
  });

  useEffect(() => {
    if (isOpen) {
      fetchFollowers();
    }
  }, [isOpen, fetchFollowers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Followers ({followers.length})</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition">
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-12">
              <UserPlusIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">No followers yet</p>
            </div>
          ) : (
            followers.map((follower) => (
              <div key={follower._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                <Link href={`/profile/${follower._id}`} onClick={onClose} className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {follower.profilePicture?.url ? (
                      <Image src={follower.profilePicture.url} alt={follower.fullName} width={48} height={48} className="object-cover" />
                    ) : (
                      <UserIcon className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{follower.fullName}</p>
                    <p className="text-white/50 text-xs truncate">@{follower.email?.split("@")[0]}</p>
                  </div>
                </Link>
                {isOwner && follower.status === "pending" ? (
                  <button
                    onClick={() => acceptRequestMutation.mutate(follower.requestId)}
                    className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition text-sm flex items-center gap-1"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Accept
                  </button>
                ) : isOwner && follower.status === "accepted" ? (
                  <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm flex items-center gap-1">
                    <UserCheckIcon className="h-4 w-4" />
                    Friend
                  </div>
                ) : !isOwner && follower._id !== currentUserId ? (
                  <button
                    onClick={() => sendRequestMutation.mutate(follower._id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition text-sm flex items-center gap-1"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    Add
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== ✨ OPTIMIZED SAVED VIDEOS MODAL (GRID LAYOUT) ✨ ====================
const SavedVideosModal = ({ isOpen, onClose, userId, router }) => {
  const [savedVideos, setSavedVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const fetchSavedVideos = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/users/saved-posts/${userId}`);
      if (response.data.success) {
        const allSaved = response.data.data || [];
        setSavedVideos(allSaved.filter(post => post.media?.resourceType === "video"));
      } else {
        setSavedVideos([]);
      }
    } catch (error) {
      console.error("Failed to fetch saved videos:", error);
      setSavedVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchSavedVideos();
    }
  }, [isOpen, fetchSavedVideos]);

  const handleVideoClick = useCallback((videoId) => {
    setIsNavigating(true);
    onClose();
    // Small delay for smooth transition
    setTimeout(() => {
      router.push(`/post/details/${videoId}`);
      setIsNavigating(false);
    }, 150);
  }, [onClose, router]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-200 ${isNavigating ? 'opacity-0' : 'opacity-100'}`} 
      onClick={onClose}
    >
      <div 
        className={`relative w-full max-w-4xl mx-4 max-h-[85vh] bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-teal-800/95 rounded-2xl overflow-hidden border border-white/20 shadow-2xl transition-transform duration-200 ${isNavigating ? 'scale-95' : 'scale-100'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-teal-800/95 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Saved Videos</h3>
            <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70">
              {savedVideos.length}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Grid Content */}
        <div className="overflow-y-auto p-4 max-h-[75vh]">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-video bg-white/10 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : savedVideos.length === 0 ? (
            <div className="text-center py-16">
              <BookmarkIcon className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/70 text-lg">No saved videos yet</p>
              <p className="text-white/40 text-sm mt-2">Videos you save will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {savedVideos.map((video) => (
                <button
                  key={video._id}
                  onClick={() => handleVideoClick(video._id)}
                  className="group relative aspect-video bg-white/5 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-400/50 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400"
                  aria-label={`View ${video.description?.slice(0, 30) || 'video'}`}
                >
                  {/* Video Thumbnail */}
{/* Thumbnail / Fallback Display */}
<div className="absolute inset-0">
  {video.media?.thumbnail ? (
    // ✅ Priority 1: Proper thumbnail available
    <Image
      src={video.media.thumbnail}
      alt={video.description || 'Saved video'}
      fill
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      sizes="(max-width: 768px) 50vw, 25vw"
      loading="lazy"
    />
  ) : video.media?.resourceType === 'video' && video.media?.url ? (
    // ✅ Priority 2: Video URL exists - use gradient + info overlay
    <>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 via-purple-600/30 to-pink-600/40" />
      
      {/* Video Icon Center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <VideoCameraIcon className="h-7 w-7 text-white" />
        </div>
      </div>
      
      {/* Bottom Info Bar - Video Title/Description Preview */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-xs font-medium truncate">
          {video.description?.slice(0, 40) || `Video ${video._id?.slice(-4)}`}
        </p>
        {video.media?.duration && (
          <span className="text-white/70 text-[10px]">
            {Math.floor(video.media.duration / 60)}:{String(video.media.duration % 60).padStart(2, '0')}
          </span>
        )}
      </div>
    </>
  ) : (
    //  Priority 3: Complete fallback
    <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
      <VideoCameraIcon className="h-8 w-8 text-white/40" />
    </div>
  )}
</div>
                  
                  {/* Play Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Duration Badge (if available) */}
                  {video.media?.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                      {Math.floor(video.media.duration / 60)}:{String(video.media.duration % 60).padStart(2, '0')}
                    </span>
                  )}

                  {/* Hover Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== PHOTO GRID COMPONENT ====================
const PhotoGrid = ({ photos, onPhotoClick }) => {
  if (photos.length === 0) return null;
  
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {photos.slice(0, 9).map((photo, index) => (
        <button
          key={photo._id || index}
          onClick={() => onPhotoClick(photo)}
          className="relative aspect-square overflow-hidden rounded-lg bg-white/5 group cursor-pointer hover:ring-2 hover:ring-purple-400/50 transition-all"
        >
          <Image
            src={photo.media?.url || photo.url}
            alt={`Photo ${index + 1}`}
            fill
            className="object-cover transition-transform group-hover:scale-110"
            sizes="(max-width: 768px) 33vw, 25vw"
            loading="lazy"
          />
          {index === 8 && photos.length > 9 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-xl font-bold">+{photos.length - 9}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

// ==================== VIDEO GRID COMPONENT ====================
const VideoGrid = ({ videos }) => {
  if (videos.length === 0) return null;
  
  return (
    <div className="grid gap-4">
      {videos.map((video) => (
        <PostCard 
          key={video._id} 
          post={video} 
          hideMenu={false}
        />
      ))}
    </div>
  );
};

// ==================== PHOTO MODAL ====================
const PhotoModal = ({ photo, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(photo?.likes?.includes(user?._id) || false);
  const [likeCount, setLikeCount] = useState(photo?.likesCount || 0);
  const [commentText, setCommentText] = useState("");
  const [commentsCount, setCommentsCount] = useState(photo?.commentsCount || 0);

  if (!photo) return null;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(`/posts/${photo._id}/like`);
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["user-posts", photo.userId] });
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    },
    onError: () => {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
      toast.error("Failed to like photo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-posts", photo.userId] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(`/posts/${photo._id}/comment`, { text: commentText });
      return response.data;
    },
    onSuccess: () => {
      setCommentText("");
      setCommentsCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["user-posts", photo.userId] });
      toast.success("Comment added!");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    likeMutation.mutate();
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (!commentText.trim()) return;
    commentMutation.mutate();
  };

  const goToPostDetails = () => {
    router.push(`/post/details/${photo._id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-6xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/70 hover:text-white transition z-10">
          <XMarkIcon className="w-8 h-8" />
        </button>
        <div className="bg-black/90 rounded-2xl overflow-hidden border border-white/20">
          <div className="flex flex-col lg:flex-row">
            <div className="lg:flex-1 bg-black/50 flex items-center justify-center p-4">
              <div className="relative max-h-[70vh]">
                <Image
                  src={photo.media?.url || photo.url}
                  alt="Full size"
                  width={800}
                  height={600}
                  className="object-contain max-h-[70vh] w-auto mx-auto"
                />
              </div>
            </div>
            <div className="lg:w-96 bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-xl">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${photo.userId}`} onClick={onClose}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                      {photo.userProfilePicture ? (
                        <Image src={photo.userProfilePicture} alt={photo.userName} width={40} height={40} className="object-cover" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </Link>
                  <div className="flex-1">
                    <Link href={`/profile/${photo.userId}`} onClick={onClose}>
                      <h3 className="font-semibold text-white hover:text-purple-400 transition">
                        {photo.userName}
                      </h3>
                    </Link>
                  </div>
                </div>
              </div>
              {photo.description && (
                <div className="p-4 border-b border-white/10">
                  <p className="text-white/80 text-sm">{photo.description}</p>
                </div>
              )}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-6">
                  <button onClick={handleLike} className="flex items-center gap-2 text-white/60 hover:text-red-400 transition-colors">
                    {isLiked ? <HeartSolidIcon className="h-6 w-6 text-red-500" /> : <HeartIcon className="h-6 w-6" />}
                    <span className="text-sm">{likeCount}</span>
                  </button>
                  <button onClick={goToPostDetails} className="flex items-center gap-2 text-white/60 hover:text-purple-400 transition-colors">
                    <ChatBubbleLeftIcon className="h-6 w-6" />
                    <span className="text-sm">{commentsCount}</span>
                  </button>
                  <button onClick={goToPostDetails} className="flex items-center gap-2 text-white/60 hover:text-green-400 transition-colors">
                    <ShareIcon className="h-6 w-6" />
                    <span className="text-sm">{photo.sharesCount || 0}</span>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button type="submit" disabled={!commentText.trim() || commentMutation.isPending} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-sm font-medium disabled:opacity-50">
                    Post
                  </button>
                </form>
                <button onClick={goToPostDetails} className="mt-3 text-xs text-white/50 hover:text-purple-400 transition">
                  View all {commentsCount} comments
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN PROFILE PAGE ====================
const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("posts");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const isOwnProfile = currentUser?._id === id || currentUser?.id === id;

  // ==================== QUERIES WITH OPTIMIZED CACHING ====================
  
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/users/id/${id}`);
      if (!response.data.success) throw new Error("Failed to fetch profile");
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
    retry: 1,
  });

  const {
    data: postsData,
    isLoading: postsLoading,
    refetch: refetchPosts
  } = useQuery({
    queryKey: ["user-posts", id],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(`/posts/user/${id}`);
        return response.data.success ? response.data.data : [];
      } catch (error) {
        console.log("Posts endpoint not available:", error.message);
        return [];
      }
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  const { data: friendsCount } = useQuery({
    queryKey: ["friends-count", id],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(`/users/friends/count/${id}`);
        return response.data.success ? response.data.count : 0;
      } catch {
        return 0;
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const { data: followersCount } = useQuery({
    queryKey: ["followers-count", id],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(`/users/followers/count/${id}`);
        return response.data.success ? response.data.count : 0;
      } catch {
        return 0;
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  // ✨ NEW: Saved Videos Count Query
  const { data: savedVideosCount } = useQuery({
    queryKey: ["saved-videos-count", id],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(`/users/saved-posts/${id}`);
        if (response.data.success) {
          const allSaved = response.data.data || [];
          return allSaved.filter(post => post.media?.resourceType === "video").length;
        }
        return 0;
      } catch {
        return 0;
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!id && isOwnProfile,
  });

  const { data: friendStatusData } = useQuery({
    queryKey: ["friend-status", id],
    queryFn: async () => {
      if (!isAuthenticated || isOwnProfile) return null;
      const response = await axiosInstance.get(`/users/friend-status/${id}`);
      return response.data.success ? response.data.status : null;
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!id && isAuthenticated && !isOwnProfile,
  });

  // ==================== FILTER POSTS ====================
  const allPosts = postsData || [];
  
  const photos = useMemo(() => {
    return allPosts.filter(post => 
      post.media && 
      post.media.url && 
      (post.media.resourceType === "image" || post.media.resourceType === "photo")
    );
  }, [allPosts]);
  
  const videos = useMemo(() => {
    return allPosts.filter(post => 
      post.media && 
      post.media.url && 
      post.media.resourceType === "video"
    );
  }, [allPosts]);

  const profileUser = profileData;
  const stats = {
    posts: allPosts.length,
    friends: friendsCount || 0,
    followers: followersCount || 0,
    saved: savedVideosCount || 0,
  };
  const friendStatus = friendStatusData;

  // ==================== MUTATIONS ====================
  const handleSendFriendRequest = async () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await axiosInstance.post(`/users/friend-request/${id}`);
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ["friend-status", id] });
        toast.success("Friend request sent!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMessageClick = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    router.push(`/message?userId=${id}`);
  };

  const handlePostUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["user-posts", id] });
    refetchPosts();
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
  };

  const formatDate = (date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfileHeaderSkeleton />
          <ProfileInfoSkeleton />
          <TabsSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (profileError || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <UserIcon className="h-20 w-20 text-white/30 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
          <p className="text-white/60 mb-6">The profile you're looking for doesn't exist</p>
          <Link href="/" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cover Photo Section */}
        <div className="relative mb-20">
          <div className="h-48 sm:h-64 rounded-2xl overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20">
            {profileUser.coverPhoto?.url ? (
              <Image
                src={profileUser.coverPhoto.url}
                alt="Cover"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={false}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                <CameraIcon className="h-12 w-12 text-white/50" />
              </div>
            )}
          </div>
          
          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-6">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/20 backdrop-blur-xl bg-white/10 overflow-hidden">
                {profileUser.profilePicture?.url ? (
                  <Image
                    src={profileUser.profilePicture.url}
                    alt={profileUser.fullName}
                    fill
                    className="object-cover"
                    sizes="128px"
                    priority={true}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Link
                  href={`/profile/edit/${id}`}
                  className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                  aria-label="Edit profile"
                >
                  <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {profileUser.fullName}
                </h1>
                {profileUser.isVerified && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                    Verified
                  </span>
                )}
                {isOwnProfile && (
                  <Link
                    href={`/profile/edit/${id}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-white/80 text-sm hover:bg-white/20 transition-colors"
                  >
                    <PencilIcon className="h-3 w-3" />
                    <span>Edit Profile</span>
                  </Link>
                )}
              </div>
              <p className="text-white/60 text-sm mt-1">@{profileUser.email?.split("@")[0]}</p>
              
              {profileUser.bio && (
                <p className="text-white/80 mt-3">{profileUser.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-4 mt-4">
                {profileUser.location && (
                  <div className="flex items-center gap-1 text-white/60 text-sm">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{profileUser.location}</span>
                  </div>
                )}
                {profileUser.website && (
                  <div className="flex items-center gap-1 text-white/60 text-sm">
                    <LinkIcon className="h-4 w-4" />
                    <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400">
                      {profileUser.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1 text-white/60 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Joined {formatDate(profileUser.createdAt)}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="flex gap-2">
                <button
                  onClick={handleMessageClick}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  Message
                </button>
                
                {friendStatus === "friends" ? (
                  <div className="px-6 py-2 rounded-xl bg-green-500/20 border border-green-500/50 text-green-400 font-semibold flex items-center gap-2">
                    <UserCheckIcon className="h-5 w-5" />
                    Friends
                  </div>
                ) : friendStatus === "request_sent" ? (
                  <div className="px-6 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-semibold flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    Request Sent
                  </div>
                ) : friendStatus === "request_received" ? (
                  <Link
                    href="/community"
                    className="px-6 py-2 rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-400 font-semibold hover:bg-blue-500/30 transition flex items-center gap-2"
                  >
                    <UserPlusIcon className="h-5 w-5" />
                    Respond
                  </Link>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={isProcessing}
                    className="px-6 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                  >
                    <UserPlusIcon className="h-5 w-5" />
                    {isProcessing ? "Sending..." : "Add Friend"}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* ✨ UPDATED Stats Section - Saved moved here with BookmarkIcon */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-6 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.posts}</p>
              <p className="text-white/60 text-sm">Posts</p>
            </div>
            <button onClick={() => setShowFriendsModal(true)} className="text-center hover:scale-105 transition-transform">
              <p className="text-xl font-bold text-white">{stats.friends}</p>
              <p className="text-white/60 text-sm">Friends</p>
            </button>
            <button onClick={() => setShowFollowersModal(true)} className="text-center hover:scale-105 transition-transform">
              <p className="text-xl font-bold text-white">{stats.followers}</p>
              <p className="text-white/60 text-sm">Followers</p>
            </button>
            
            {/* ✨ NEW: Saved Videos Button (Only for own profile) */}
            {isOwnProfile && (
              <button 
                onClick={() => setShowSavedModal(true)} 
                className="text-center hover:scale-105 transition-transform group"
              >
                <div className="flex items-center gap-1 justify-center">
                  <BookmarkIcon className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  <p className="text-xl font-bold text-white">{stats.saved}</p>
                </div>
                <p className="text-white/60 text-sm">Saved</p>
              </button>
            )}
          </div>
        </div>

        {/* ✨ UPDATED Tabs - Removed "Saved" tab */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/10 overflow-x-auto">
            {[
              { id: "posts", label: "Posts", icon: DocumentTextIcon, count: allPosts.length },
              { id: "photos", label: "Photos", icon: PhotoIcon, count: photos.length },
              { id: "videos", label: "Videos", icon: VideoCameraIcon, count: videos.length },
              // ✨ Saved tab removed - now in stats section above
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-purple-400 border-b-2 border-purple-400 bg-white/5"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.charAt(0)}</span>
                  {tab.count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content based on active tab */}
          <div className="p-4 sm:p-6">
            {/* Posts Tab */}
            {activeTab === "posts" && (
              <>
                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-64 bg-white/10 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : allPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No posts yet</p>
                    {isOwnProfile && (
                      <Link href="/create-post" className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform">
                        Create Your First Post
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {allPosts.map((post) => (
                      <PostCard 
                        key={post._id} 
                        post={post} 
                        onPostUpdate={handlePostUpdate}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Photos Tab */}
            {activeTab === "photos" && (
              <>
                {postsLoading ? (
                  <div className="grid grid-cols-3 gap-1 sm:gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="aspect-square bg-white/10 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : photos.length === 0 ? (
                  <div className="text-center py-12">
                    <PhotoIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No photos yet</p>
                    {isOwnProfile && (
                      <Link href="/create-post" className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform">
                        Share Your First Photo
                      </Link>
                    )}
                  </div>
                ) : (
                  <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
                )}
              </>
            )}

            {/* Videos Tab */}
            {activeTab === "videos" && (
              <>
                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-64 bg-white/10 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-12">
                    <VideoCameraIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No videos yet</p>
                    {isOwnProfile && (
                      <Link href="/create-post" className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform">
                        Upload Your First Video
                      </Link>
                    )}
                  </div>
                ) : (
                  <VideoGrid videos={videos} />
                )}
              </>
            )}

            {/* ✨ Saved tab content removed - now handled by modal */}
          </div>
        </div>
      </div>

      {/* Floating Create Post Button */}
      {isOwnProfile && (
        <Link
          href="/create-post"
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-40 p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group"
          aria-label="Create post"
        >
          <PlusIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          <span className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-black/80 text-white text-sm px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Create Post
          </span>
        </Link>
      )}

      {/* Modals */}
      {selectedPhoto && <PhotoModal photo={selectedPhoto} onClose={closePhotoModal} />}
      {showFriendsModal && <FriendsModal isOpen={showFriendsModal} onClose={() => setShowFriendsModal(false)} userId={id} isOwner={isOwnProfile} />}
      {showFollowersModal && <FollowersModal isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} userId={id} isOwner={isOwnProfile} currentUserId={currentUser?._id} />}
      
      {/* ✨ UPDATED: Saved Videos Modal with Grid Layout */}
      {showSavedModal && isOwnProfile && (
        <SavedVideosModal 
          isOpen={showSavedModal} 
          onClose={() => setShowSavedModal(false)} 
          userId={id}
          router={router}
        />
      )}
    </div>
  );
};

export default ProfilePage;