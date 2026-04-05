"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  CalendarIcon,
  CameraIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
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
  UserPlusIcon,
  VideoCameraIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheckIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

const ProfilePageSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <ProfileHeaderSkeleton />
      <ProfileInfoSkeleton />
      <TabsSkeleton />
    </div>
  </div>
);

// ==================== PHOTO GRID COMPONENT ====================
const PhotoGrid = ({ photos, onPhotoClick }) => {
  if (photos.length === 0) return null;
  
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {photos.slice(0, 9).map((photo, index) => (
        <button
          key={photo._id || index}
          onClick={() => onPhotoClick(photo)}
          className="relative aspect-square overflow-hidden rounded-lg bg-white/5 group cursor-pointer"
        >
          <Image
            src={photo.media?.url || photo.url}
            alt={`Photo ${index + 1}`}
            fill
            className="object-cover transition-transform group-hover:scale-110"
            sizes="(max-width: 768px) 33vw, 25vw"
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

// ==================== VIDEO GRID COMPONENT (USING POSTCARD) ====================
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

// ==================== PHOTO MODAL WITH POST DETAILS (FIXED) ====================
const PhotoModal = ({ photo, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(photo?.likes?.includes(user?._id) || false);
  const [likeCount, setLikeCount] = useState(photo?.likesCount || 0);
  const [commentText, setCommentText] = useState("");
  const [commentsCount, setCommentsCount] = useState(photo?.commentsCount || 0);

  if (!photo) return null;

  // Like mutation
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

  // Comment mutation
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
    onError: () => {
      toast.error("Failed to add comment");
    },
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition z-10"
        >
          <XMarkIcon className="w-8 h-8" />
        </button>

        <div className="bg-black/90 rounded-2xl overflow-hidden border border-white/20">
          <div className="flex flex-col lg:flex-row">
            {/* Photo Section */}
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

            {/* Post Details Section */}
            <div className="lg:w-96 bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-xl">
              {/* Post Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${photo.userId}`} onClick={onClose}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                      {photo.userProfilePicture ? (
                        <Image
                          src={photo.userProfilePicture}
                          alt={photo.userName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
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

              {/* Description */}
              {photo.description && (
                <div className="p-4 border-b border-white/10">
                  <p className="text-white/80 text-sm">{photo.description}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-6">
                  <button
                    onClick={handleLike}
                    className="flex items-center gap-2 text-white/60 hover:text-red-400 transition-colors"
                  >
                    {isLiked ? (
                      <HeartSolidIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <HeartIcon className="h-6 w-6" />
                    )}
                    <span className="text-sm">{likeCount}</span>
                  </button>
                  
                  <button
                    onClick={goToPostDetails}
                    className="flex items-center gap-2 text-white/60 hover:text-purple-400 transition-colors"
                  >
                    <ChatBubbleLeftIcon className="h-6 w-6" />
                    <span className="text-sm">{commentsCount}</span>
                  </button>
                  
                  <button
                    onClick={goToPostDetails}
                    className="flex items-center gap-2 text-white/60 hover:text-green-400 transition-colors"
                  >
                    <ShareIcon className="h-6 w-6" />
                    <span className="text-sm">{photo.sharesCount || 0}</span>
                  </button>
                </div>
              </div>

              {/* Comment Input */}
              <div className="p-4">
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || commentMutation.isPending}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-sm font-medium disabled:opacity-50"
                  >
                    Post
                  </button>
                </form>
                
                <button
                  onClick={goToPostDetails}
                  className="mt-3 text-xs text-white/50 hover:text-purple-400 transition"
                >
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

// ==================== MAIN COMPONENT ====================

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("posts");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const isOwnProfile = currentUser?._id === id || currentUser?.id === id;

  // ==================== QUERIES WITH CACHING ====================
  
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

  const {
    data: statsData,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ["user-stats", id],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(`/users/stats/${id}`);
        return response.data.success ? response.data.data : { followers: 0, following: 0 };
      } catch (error) {
        console.log("Stats endpoint not available:", error.message);
        return { followers: 0, following: 0 };
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  const {
    data: friendStatusData,
  } = useQuery({
    queryKey: ["friend-status", id],
    queryFn: async () => {
      if (!isAuthenticated || isOwnProfile) return null;
      const response = await axiosInstance.get(`/users/friend-status/${id}`);
      return response.data.success ? response.data.status : null;
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
    enabled: !!id && isAuthenticated && !isOwnProfile,
  });

  // ==================== FILTER POSTS BY TYPE ====================
  
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
    followers: statsData?.followers || 0,
    following: statsData?.following || 0,
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
    return <ProfilePageSkeleton />;
  }

  // Error state
  if (profileError || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <UserIcon className="h-20 w-20 text-white/30 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
          <p className="text-white/60 mb-6">The profile you're looking for doesn't exist</p>
          <Link
            href="/"
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
          >
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
                  aria-label="Send message"
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
                    aria-label="Add friend"
                  >
                    <UserPlusIcon className="h-5 w-5" />
                    {isProcessing ? "Sending..." : "Add Friend"}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Stats with loading state */}
          <div className="flex gap-6 mt-6 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.posts}</p>
              <p className="text-white/60 text-sm">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {statsLoading ? (
                  <span className="inline-block w-8 h-6 bg-white/20 rounded animate-pulse" />
                ) : (
                  stats.followers
                )}
              </p>
              <p className="text-white/60 text-sm">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {statsLoading ? (
                  <span className="inline-block w-8 h-6 bg-white/20 rounded animate-pulse" />
                ) : (
                  stats.following
                )}
              </p>
              <p className="text-white/60 text-sm">Following</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/10">
            {[
              { id: "posts", label: "Posts", icon: DocumentTextIcon, count: allPosts.length },
              { id: "photos", label: "Photos", icon: PhotoIcon, count: photos.length },
              { id: "videos", label: "Videos", icon: VideoCameraIcon, count: videos.length },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? "text-purple-400 border-b-2 border-purple-400 bg-white/5"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                  aria-label={`Show ${tab.label}`}
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
                      <Link
                        href="/create-post"
                        className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform"
                      >
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

            {/* Photos Tab - Grid Layout */}
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
                      <Link
                        href="/create-post"
                        className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform"
                      >
                        Share Your First Photo
                      </Link>
                    )}
                  </div>
                ) : (
                  <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
                )}
              </>
            )}

            {/* Videos Tab - Using PostCard component like PostCard.jsx */}
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
                      <Link
                        href="/create-post"
                        className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform"
                      >
                        Upload Your First Video
                      </Link>
                    )}
                  </div>
                ) : (
                  <VideoGrid videos={videos} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Create Post Button - FAB (only for own profile) */}
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

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal 
          photo={selectedPhoto} 
          onClose={closePhotoModal}
        />
      )}
    </div>
  );
};

export default ProfilePage;