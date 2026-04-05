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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const PostCard = ({ post, onPostUpdate, hideMenu = false }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(post.likes?.includes(user?._id) || post.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
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

  // Check authentication helper
  const checkAuth = () => {
    if (!isAuthenticated) {
      toast.error("Please login to continue");
      router.push("/auth/login");
      return false;
    }
    return true;
  };

  // Like Mutation with optimistic update
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(`/posts/${post._id}/like`);
      return response.data;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["post", post._id] });
      
      // Snapshot previous value
      const previousPosts = queryClient.getQueryData(["posts"]);
      const previousPost = queryClient.getQueryData(["post", post._id]);
      
      // Optimistic update for posts list
      queryClient.setQueryData(["posts"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((p) =>
              p._id === post._id
                ? {
                    ...p,
                    likes: p.likes?.includes(user?._id)
                      ? p.likes.filter((id) => id !== user?._id)
                      : [...(p.likes || []), user?._id],
                    likesCount: p.likes?.includes(user?._id)
                      ? p.likesCount - 1
                      : p.likesCount + 1,
                  }
                : p
            ),
          })),
        };
      });
      
      // Optimistic update for single post
      queryClient.setQueryData(["post", post._id], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            likes: old.data.likes?.includes(user?._id)
              ? old.data.likes.filter((id) => id !== user?._id)
              : [...(old.data.likes || []), user?._id],
            likesCount: old.data.likes?.includes(user?._id)
              ? old.data.likesCount - 1
              : old.data.likesCount + 1,
          }
        };
      });
      
      // Update local state
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      
      return { previousPosts, previousPost };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["posts"], context.previousPosts);
      queryClient.setQueryData(["post", post._id], context.previousPost);
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
      toast.error("Failed to like post");
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", post._id] });
      if (onPostUpdate) onPostUpdate();
    },
  });

  const handleLike = () => {
    if (!checkAuth()) return;
    likeMutation.mutate();
  };

  // Share Mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(`/posts/${post._id}/share`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Post shared successfully!");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      if (onPostUpdate) onPostUpdate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to share post");
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async (description) => {
      const response = await axiosInstance.patch(`/posts/${post._id}`, { description });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Post updated successfully!");
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", post._id] });
      if (onPostUpdate) onPostUpdate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update post");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.delete(`/posts/${post._id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Post deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      if (onPostUpdate) onPostUpdate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete post");
    },
  });

  const handleComment = () => {
    if (!checkAuth()) return;
    goToPostDetails();
  };

  const handleShare = () => {
    if (!checkAuth()) return;
    goToPostDetails();
  };

  const handleEditPost = async () => {
    if (!editDescription.trim()) {
      toast.error("Please add a description");
      return;
    }
    editMutation.mutate(editDescription);
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    deleteMutation.mutate();
  };

  const handleSharePost = () => {
    if (!checkAuth()) return;
    shareMutation.mutate();
    setShowMenu(false);
  };

  const goToPostDetails = () => {
    router.push(`/post/details/${post._id}`);
  };

  return (
    <>
      <div className="backdrop-blur-xl mt-2  bg-white/5 rounded-2xl border border-white/20 p-5 hover:bg-white/10 transition-all duration-300">
        {/* Post Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <Link href={`/profile/${post.userId}`}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer">
                {post.userProfilePicture ? (
                  <Image
                    src={post.userProfilePicture}
                    alt={post.userName}
                    width={56}
                    height={56}
                    className="object-cover"
                  />
                ) : (
                  <UserIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                )}
              </div>
            </Link>
            <div className="flex-1">
              <Link href={`/profile/${post.userId}`}>
                <h3 className="font-semibold text-white hover:text-purple-400 transition text-base sm:text-lg">
                  {post.userName}
                </h3>
              </Link>
              <p className="text-white/40 text-xs sm:text-sm">{getTimeAgo(post.createdAt)}</p>
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
                    disabled={shareMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <ShareIcon className="h-4 w-4" />
                    <span className="text-sm">{shareMutation.isPending ? "Sharing..." : "Share"}</span>
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

        {/* Post Content - Clickable */}
        <div 
          onClick={goToPostDetails}
          className="mt-4 cursor-pointer"
        >
          {post.description && (
            <p className="text-white/80 mb-4 text-base sm:text-lg break-words leading-relaxed line-clamp-5">
              {post.description}
            </p>
          )}
          {post.media && (
            <div className="rounded-xl overflow-hidden bg-black/20 -mx-5">
              {post.media.resourceType === "video" ? (
                <video
                  src={post.media.url}
                  controls
                  className="w-full max-h-[600px] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <Image
                  src={post.media.url}
                  alt="Post media"
                  width={800}
                  height={600}
                  className="w-full object-cover max-h-[600px]"
                />
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around gap-4 mt-4 pt-4 border-t border-white/10">
          <button
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className="flex items-center gap-2 text-white/60 hover:text-red-400 transition-colors disabled:opacity-50 py-1 px-4 rounded-lg hover:bg-white/5"
          >
            {isLiked ? (
              <HeartSolidIcon className="h-6 w-6 text-red-500" />
            ) : (
              <HeartIcon className="h-6 w-6" />
            )}
            <span className="text-sm font-medium">{likeCount}</span>
          </button>
          
          <button
            onClick={handleComment}
            className="flex items-center gap-2 text-white/60 hover:text-purple-400 transition-colors py-1 px-4 rounded-lg hover:bg-white/5"
          >
            <ChatBubbleLeftIcon className="h-6 w-6" />
            <span className="text-sm font-medium">{commentCount}</span>
          </button>
          
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-white/60 hover:text-green-400 transition-colors py-1 px-4 rounded-lg hover:bg-white/5"
          >
            <ShareIcon className="h-6 w-6" />
            <span className="text-sm font-medium">{shareCount}</span>
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
                disabled={editMutation.isPending}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
              >
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;