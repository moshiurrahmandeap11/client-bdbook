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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

const PostCard = ({ post, onPostUpdate, hideMenu = false }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(() => post.likes?.includes(user?._id) || post.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const menuRef = useRef(null);
  const touchStartRef = useRef(0);

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

  const getTimeAgo = useCallback((date) => {
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
  }, []);

  const checkAuth = useCallback(() => {
    if (!isAuthenticated) {
      toast.error("Please login to continue");
      router.push("/auth/login");
      return false;
    }
    return true;
  }, [isAuthenticated, router]);

  // Like Mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(`/posts/${post._id}/like`);
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      
      const previousPosts = queryClient.getQueryData(["posts"]);
      
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
      
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      
      return { previousPosts };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["posts"], context.previousPosts);
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
      toast.error("Failed to like post");
    },
  });

  const handleLike = useCallback(() => {
    if (!checkAuth()) return;
    likeMutation.mutate();
  }, [checkAuth, likeMutation]);

  const goToPostDetails = useCallback(() => {
    router.push(`/post/details/${post._id}`);
  }, [router, post._id]);

  const handleComment = useCallback(() => {
    if (!checkAuth()) return;
    goToPostDetails();
  }, [checkAuth, goToPostDetails]);

  const handleShare = useCallback(() => {
    if (!checkAuth()) return;
    goToPostDetails();
  }, [checkAuth, goToPostDetails]);

  const handleProfileClick = useCallback(() => {
    router.push(`/profile/${post.userId}`);
  }, [router, post.userId]);

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

  const handleSharePost = useCallback(() => {
    if (!checkAuth()) return;
    shareMutation.mutate();
    setShowMenu(false);
  }, [checkAuth, shareMutation]);

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
      if (onPostUpdate) onPostUpdate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update post");
    },
  });

  const handleEditPost = useCallback(() => {
    if (!editDescription.trim()) {
      toast.error("Please add a description");
      return;
    }
    editMutation.mutate(editDescription);
  }, [editDescription, editMutation]);

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

  const handleDeletePost = useCallback(() => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    deleteMutation.mutate();
  }, [deleteMutation]);

  // Optimize image loading
  const imageProps = useMemo(() => {
    if (!post.media?.url) return null;
    return {
      src: post.media.url,
      alt: "Post media",
      width: 800,
      height: 600,
      loading: "lazy",
      className: "w-full object-cover max-h-[500px]",
    };
  }, [post.media]);

  return (
    <>
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:bg-white/8 transition-all duration-200">
        <div className="p-4">
          {/* Post Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <button 
                onClick={handleProfileClick}
                className="flex-shrink-0 focus:outline-none"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                  {post.userProfilePicture ? (
                    <Image
                      src={post.userProfilePicture}
                      alt={post.userName}
                      width={48}
                      height={48}
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  )}
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <button 
                  onClick={handleProfileClick}
                  className="font-semibold text-white hover:text-purple-400 transition text-sm sm:text-base"
                >
                  {post.userName}
                </button>
                <p className="text-white/40 text-xs">{getTimeAgo(post.createdAt)}</p>
              </div>
            </div>
            
            {/* 3 Dots Menu */}
            {!hideMenu && (isOwner || user?.role === "admin") && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  <EllipsisHorizontalIcon className="h-5 w-5 text-white/70" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl bg-black/95 border border-white/20 shadow-2xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setShowEditModal(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit Post
                    </button>
                    <button
                      onClick={handleSharePost}
                      disabled={shareMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm"
                    >
                      <ShareIcon className="h-4 w-4" />
                      {shareMutation.isPending ? "Sharing..." : "Share"}
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Post Content */}
          <div 
            onClick={goToPostDetails}
            className="mt-3 cursor-pointer active:opacity-80 transition-opacity"
          >
            {post.description && (
              <p className="text-white/80 text-sm sm:text-base break-words leading-relaxed line-clamp-4">
                {post.description}
              </p>
            )}
            {imageProps && (
              <div className="rounded-xl overflow-hidden bg-black/20 -mx-4 mt-3">
                {post.media.resourceType === "video" ? (
                  <video
                    src={post.media.url}
                    controls
                    className="w-full max-h-[400px] object-contain"
                    onClick={(e) => e.stopPropagation()}
                    preload="metadata"
                  />
                ) : (
                  <Image
                    {...imageProps}
                    alt="Post media"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-around gap-2 mt-4 pt-3 border-t border-white/10">
            <button
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className="flex items-center gap-2 text-white/60 hover:text-red-400 active:bg-white/5 transition-colors disabled:opacity-50 py-2 px-3 rounded-lg"
            >
              {isLiked ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
            
            <button
              onClick={handleComment}
              className="flex items-center gap-2 text-white/60 hover:text-purple-400 active:bg-white/5 transition-colors py-2 px-3 rounded-lg"
            >
              <ChatBubbleLeftIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{commentCount}</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-white/60 hover:text-green-400 active:bg-white/5 transition-colors py-2 px-3 rounded-lg"
            >
              <ShareIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{shareCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Post Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-black/95 rounded-t-2xl sm:rounded-2xl border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Edit Post</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditDescription(post.description || "");
                }}
                className="p-2 rounded-full bg-white/10 active:bg-white/20 transition"
              >
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-4">
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleEditPost}
                disabled={editMutation.isPending}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold active:scale-95 transition-all duration-200 disabled:opacity-50"
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