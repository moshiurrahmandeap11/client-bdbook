"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { postService } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import { IUser } from "@/types/user.types";
import {
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import Avatar from "./Avatar";
import CustomVideoPlayer from "./CustomVideoPlayer";
import SharedPostPreview from "./SharedPostPreview";
import ShareModal from "./ShareModal";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { cn } from "@/lib/utils";

const getTimeAgo = (date?: string | Date) => {
  if (!date) return "recently";
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  for (const [unit, s] of Object.entries(intervals)) {
    const n = Math.floor(seconds / s);
    if (n >= 1) return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
};

interface PostCardProps {
  post: IPost | any;
  onPostUpdate?: () => void;
  hideMenu?: boolean;
  currentUser?: IUser | null;
}

export const PostCard = memo(({ post, onPostUpdate, hideMenu = false }: PostCardProps) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentUserId = user?._id || user?.id;

  const initialLikeState = useMemo(() => {
    const likesArr = post.likes || [];
    const isLiked = likesArr.includes(currentUserId) || post.isLikedByCurrentUser;
    return {
      isLiked: !!isLiked,
      likeCount: post.likesCount || likesArr.length || 0,
    };
  }, [post.likes, post.isLikedByCurrentUser, post.likesCount, currentUserId]);

  const [isLiked, setIsLiked] = useState(initialLikeState.isLiked);
  const [likeCount, setLikeCount] = useState(initialLikeState.likeCount);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const postUserId = post.userId || post.user?._id || post.user?.id;
  const isOwner = postUserId === currentUserId;
  const commentCount = post.commentsCount || post.comments?.length || 0;
  const shareCount = post.sharesCount || 0;

  const isSharedPost = useMemo(
    () => !!(post.isShare || post.originalPost || post.sharedPost || post.sharedPostId || post.type === "share"),
    [post.isShare, post.originalPost, post.sharedPost, post.sharedPostId, post.type]
  );

  const originalPost = useMemo(() => post.originalPost || post.sharedPost || null, [post.originalPost, post.sharedPost]);

  const sharePreview = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const targetPost = originalPost || post;
    return {
      postUrl: `${origin}/post/details/${targetPost?._id || targetPost?.id}`,
      text: post.description || originalPost?.description || "Shared a post",
    };
  }, [post.description, originalPost?.description, originalPost?._id, originalPost?.id, post._id, post.id]);

  useEffect(() => {
    setIsLiked(initialLikeState.isLiked);
    setLikeCount(initialLikeState.likeCount);
  }, [initialLikeState]);

  const checkAuth = useCallback(() => {
    if (!isAuthenticated) {
      toast.error("Please login to continue");
      router.push("/auth/login");
      return false;
    }
    return true;
  }, [isAuthenticated, router]);

  const likeMutation = useMutation({
    mutationFn: () => postService.likePost(post._id || post.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previous = queryClient.getQueryData(["posts"]);

      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((p: any) => {
              const pId = p._id || p.id;
              const targetId = post._id || post.id;
              if (pId !== targetId) return p;
              const wasLiked = p.likes?.includes(currentUserId);
              return {
                ...p,
                likes: wasLiked
                  ? p.likes?.filter((id: string) => id !== currentUserId)
                  : [...(p.likes || []), currentUserId],
                likesCount: wasLiked ? (p.likesCount || 1) - 1 : (p.likesCount || 0) + 1,
              };
            }),
          })),
        };
      });
      return { previous };
    },
    onError: (err, vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(["posts"], context.previous);
      }
      toast.error("Failed to like post");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["posts", post._id || post.id],
        refetchType: "none",
      });
    },
  });

  const shareToFeedMutation = useMutation({
    mutationFn: () => postService.sharePost(post._id || post.id),
    onSuccess: () => {
      toast.success("Post shared to your feed!");
      setShowShareModal(false);
      onPostUpdate?.();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to share post");
    },
  });

  const shareToMessageMutation = useMutation({
    mutationFn: (friendId: string) => {
      const postId = String(post._id || post.id)?.trim();
      return axiosInstance
        .post(`/users/send-message/${friendId}`, {
          message: JSON.stringify({
            type: "post_share",
            postId,
            postUrl: sharePreview.postUrl,
            postText: post.description,
            postAuthor: post.userName || post.user?.fullName,
            postAuthorProfilePic: post.userProfilePicture || post.user?.profilePicture?.url,
            hasMedia: !!(post.mediaUrl || post.media?.url),
            mediaType: post.mediaType || post.media?.resourceType,
            mediaUrl: post.mediaUrl || post.media?.url,
            sharedBy: user?.fullName || user?.name,
            sharedByProfilePic:
              typeof user?.profilePicture === "object"
                ? user?.profilePicture?.url
                : user?.profilePicture || user?.avatar,
          }),
          messageType: "share",
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      toast.success("Post shared via message!");
      setShowShareModal(false);
    },
    onError: () => toast.error("Failed to share via message"),
  });

  const editMutation = useMutation({
    mutationFn: (description: string) =>
      postService.updatePost(post._id || post.id, { description }),
    onSuccess: () => {
      toast.success("Post updated!");
      setShowEditModal(false);
      onPostUpdate?.();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update post"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postService.deletePost(post._id || post.id),
    onMutate: async () => {
      setIsDeleting(true);
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previous = queryClient.getQueryData(["posts"]);

      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((p: any) => (p._id || p.id) !== (post._id || post.id)),
          })),
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success("Post deleted");
      onPostUpdate?.();
    },
    onError: (err, vars, context: any) => {
      setIsDeleting(false);
      if (context?.previous) {
        queryClient.setQueryData(["posts"], context.previous);
      }
      toast.error("Failed to delete post");
    },
  });

  const handleLike = useCallback(() => {
    if (!checkAuth()) return;
    setIsLiked((prev: boolean) => !prev);
    setLikeCount((prev: number) => prev + (isLiked ? -1 : 1));
    likeMutation.mutate();
  }, [checkAuth, likeMutation, isLiked]);

  const goToPostDetails = useCallback(() => {
    router.push(`/post/details/${post._id || post.id}`);
  }, [router, post._id, post.id]);

  const handleComment = useCallback(() => {
    if (!checkAuth()) return;
    goToPostDetails();
  }, [checkAuth, goToPostDetails]);

  const handleSharePost = useCallback(() => {
    if (!checkAuth()) return;
    setShowShareModal(true);
  }, [checkAuth]);

  const handleDeletePost = useCallback(() => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    deleteMutation.mutate();
  }, [deleteMutation]);

  const handleEditPost = useCallback(() => {
    if (!editDescription.trim()) {
      toast.error("Please add a description");
      return;
    }
    editMutation.mutate(editDescription);
  }, [editDescription, editMutation]);

  const dropdownItems = useMemo(() => {
    const items = [];
    if (isOwner || user?.role === "ADMIN" || (user?.role as string) === "admin") {
      items.push({
        label: "Edit Post",
        icon: <PencilIcon className="h-4 w-4" />,
        onClick: () => setShowEditModal(true),
      });
    }
    items.push({
      label: "Share",
      icon: <ShareIcon className="h-4 w-4" />,
      onClick: handleSharePost,
    });
    if (isOwner || user?.role === "ADMIN" || (user?.role as string) === "admin") {
      items.push({
        label: "Delete Post",
        icon: <TrashIcon className="h-4 w-4" />,
        onClick: handleDeletePost,
        danger: true,
      });
    }
    return items;
  }, [isOwner, user?.role, handleSharePost, handleDeletePost]);

  const authorName = post.userName || post.user?.fullName || "User";
  const authorPic = post.userProfilePicture || post.user?.profilePicture?.url;
  const mediaUrl = post.mediaUrl || post.media?.url;
  const mediaType = post.mediaType || post.media?.resourceType || "image";

  return (
    <>
      <div
        className={cn(
          "bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-sm transition-all duration-200 overflow-hidden",
          isDeleting && "opacity-50 scale-[0.98]"
        )}
      >
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                onClick={() => router.push(`/profile/${postUserId}`)}
                className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded-full cursor-pointer"
                aria-label={`View ${authorName}'s profile`}
              >
                <Avatar src={authorPic} name={authorName} size={44} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => router.push(`/profile/${postUserId}`)}
                    className="font-semibold text-sm leading-tight text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                    aria-label={`View ${authorName}'s profile`}
                  >
                    {authorName}
                  </button>
                  {isSharedPost && (
                    <span className="text-xs text-slate-400">
                      shared a post
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {getTimeAgo(post.createdAt)}
                </p>
              </div>
            </div>

            {/* Menu Dropdown using reusable Dropdown */}
            {!hideMenu && dropdownItems.length > 0 && (
              <Dropdown
                align="right"
                trigger={
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
                    aria-label="Post options"
                  >
                    <EllipsisHorizontalIcon className="h-5 w-5" />
                  </button>
                }
                items={dropdownItems}
              />
            )}
          </div>

          {/* Description */}
          {post.description && (
            <p
              className="mt-3 text-sm text-slate-800 leading-relaxed break-words cursor-pointer hover:text-slate-950 transition-colors"
              onClick={goToPostDetails}
            >
              {post.description}
            </p>
          )}

          {/* Media or Shared Post Preview */}
          <div className="-mx-4 sm:-mx-5 mt-3">
            {isSharedPost ? (
              <SharedPostPreview
                originalPost={originalPost}
                postUrl={sharePreview.postUrl}
                onClick={() => {
                  const targetId = originalPost?._id || originalPost?.id || post._id || post.id;
                  if (targetId) router.push(`/post/details/${targetId}`);
                }}
              />
            ) : mediaUrl ? (
              <div
                className="overflow-hidden cursor-pointer group bg-slate-100 border-y border-slate-100"
                onClick={goToPostDetails}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && goToPostDetails()}
              >
                {mediaType === "video" ? (
                  <CustomVideoPlayer src={mediaUrl} poster={post.mediaThumbnail || post.media?.thumbnailUrl} />
                ) : (
                  <Image
                    src={mediaUrl}
                    alt={post.description || "Post media"}
                    width={800}
                    height={600}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                    style={{ maxHeight: 520 }}
                  />
                )}
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                isLiked
                  ? "text-red-500 bg-red-50 hover:bg-red-100/80"
                  : "text-slate-600 hover:text-red-500 hover:bg-slate-50"
              )}
            >
              {isLiked ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500 animate-scale" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span>{likeCount}</span>
            </button>

            <button
              onClick={handleComment}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
            >
              <ChatBubbleLeftIcon className="h-5 w-5" />
              <span>{commentCount}</span>
            </button>

            <button
              onClick={handleSharePost}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <ShareIcon className="h-5 w-5" />
              <span>{shareCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ShareModal */}
      {showShareModal && (
        <ShareModal
          post={post}
          user={user}
          sharePreview={sharePreview}
          onClose={() => setShowShareModal(false)}
          onShareToFeed={() => shareToFeedMutation.mutate()}
          onShareToMessage={(friendId) => shareToMessageMutation.mutate(friendId)}
          isSharingToFeed={shareToFeedMutation.isPending}
          isSharingToMessage={shareToMessageMutation.isPending}
        />
      )}

      {/* Edit Modal using reusable Modal & TextArea & Button */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditDescription(post.description || "");
        }}
        title="Edit Post"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditDescription(post.description || "");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditPost}
              loading={editMutation.isPending}
              disabled={!editDescription.trim()}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <TextArea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          autoFocus
        />
      </Modal>
    </>
  );
});

PostCard.displayName = "PostCard";
export default PostCard;
