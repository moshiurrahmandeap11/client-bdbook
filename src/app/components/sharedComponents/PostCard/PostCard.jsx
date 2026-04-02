"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    ChatBubbleLeftIcon,
    EllipsisHorizontalIcon,
    HeartIcon,
    PencilIcon,
    ShareIcon,
    TrashIcon,
    UserIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const PostCard = ({ post, onPostUpdate, hideMenu = false }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.likes?.includes(user?._id) || post.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const [isSharing, setIsSharing] = useState(false);
  const menuRef = useRef(null);

  const isOwner = post.userId === user?._id;
  const commentCount = post.commentsCount || 0;
  const shareCount = post.sharesCount || 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to like posts");
      router.push("/auth/login");
      return;
    }

    if (isLiking) return;
    
    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    
    try {
      const response = await axiosInstance.post(`/posts/${post._id}/like`);
      if (response.data.success) {
        // Fetch fresh data
        const freshResponse = await axiosInstance.get(`/posts/${post._id}`);
        if (freshResponse.data.success) {
          setIsLiked(freshResponse.data.data.likes?.includes(user?._id));
          setLikeCount(freshResponse.data.data.likesCount || 0);
        }
        if (onPostUpdate) onPostUpdate();
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      toast.error("Failed to process like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleEditPost = async () => {
    if (!editDescription.trim()) {
      toast.error("Please add a description");
      return;
    }

    try {
      const response = await axiosInstance.patch(`/posts/${post._id}`, {
        description: editDescription
      });

      if (response.data.success) {
        toast.success("Post updated successfully!");
        setShowEditModal(false);
        if (onPostUpdate) onPostUpdate();
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error(error.response?.data?.message || "Failed to update post");
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await axiosInstance.delete(`/posts/${post._id}`);
      if (response.data.success) {
        toast.success("Post deleted successfully!");
        if (onPostUpdate) onPostUpdate();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.message || "Failed to delete post");
    }
  };

  const handleSharePost = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to share posts");
      router.push("/auth/login");
      return;
    }

    setIsSharing(true);
    try {
      const response = await axiosInstance.post(`/posts/${post._id}/share`);
      if (response.data.success) {
        toast.success("Post shared successfully!");
        if (onPostUpdate) onPostUpdate();
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error(error.response?.data?.message || "Failed to share post");
    } finally {
      setIsSharing(false);
      setShowMenu(false);
    }
  };

  const goToPostDetails = () => {
    router.push(`/post/details/${post._id}`);
  };

  return (
    <>
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-4 hover:bg-white/10 transition-all duration-300">
        {/* Post Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Link href={`/profile/${post.userId}`}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer">
                {post.userProfilePicture ? (
                  <Image
                    src={post.userProfilePicture}
                    alt={post.userName}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
              </div>
            </Link>
            <div className="flex-1">
              <Link href={`/profile/${post.userId}`}>
                <h3 className="font-semibold text-white hover:text-purple-400 transition text-sm sm:text-base">
                  {post.userName}
                </h3>
              </Link>
              <p className="text-white/40 text-xs">{getTimeAgo(post.createdAt)}</p>
            </div>
          </div>
          
          {/* 3 Dots Menu */}
          {!hideMenu && (isOwner || user?.role === "admin") && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <EllipsisHorizontalIcon className="h-5 w-5 text-white/70" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowEditModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span className="text-sm">Edit Post</span>
                  </button>
                  <button
                    onClick={handleSharePost}
                    disabled={isSharing}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <ShareIcon className="h-4 w-4" />
                    <span className="text-sm">{isSharing ? "Sharing..." : "Share"}</span>
                  </button>
                  <button
                    onClick={handleDeletePost}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="text-sm">Delete Post</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <div 
          onClick={goToPostDetails}
          className="mt-3 cursor-pointer"
        >
          {post.description && (
            <p className="text-white/80 mb-3 text-sm sm:text-base break-words">
              {post.description}
            </p>
          )}
          {post.media && (
            <div className="rounded-xl overflow-hidden bg-black/20">
              {post.media.resourceType === "video" ? (
                <video
                  src={post.media.url}
                  controls
                  className="w-full max-h-96 object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <Image
                  src={post.media.url}
                  alt="Post media"
                  width={600}
                  height={400}
                  className="w-full object-cover max-h-96"
                />
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center gap-1 text-white/60 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {isLiked ? (
              <HeartSolidIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5" />
            )}
            <span className="text-sm">{likeCount}</span>
          </button>
          
          <button
            onClick={goToPostDetails}
            className="flex items-center gap-1 text-white/60 hover:text-purple-400 transition-colors"
          >
            <ChatBubbleLeftIcon className="h-5 w-5" />
            <span className="text-sm">{commentCount}</span>
          </button>
          
          <button
            onClick={goToPostDetails}
            className="flex items-center gap-1 text-white/60 hover:text-green-400 transition-colors"
          >
            <ShareIcon className="h-5 w-5" />
            <span className="text-sm">{shareCount}</span>
          </button>
        </div>
      </div>

      {/* Edit Post Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Edit Post</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditDescription(post.description || "");
                }}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="p-4">
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows="4"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleEditPost}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition-all duration-300"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;