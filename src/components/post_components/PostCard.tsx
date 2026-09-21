// Prepend shared post to profile cache
"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { postService } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import { IUser } from "@/types/user.types";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  EyeSlashIcon,
  LinkIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getFriendStatus, sendFriendRequest, unfriend } from "@/services/friend.service";

import Avatar from "./Avatar";
import CustomVideoPlayer from "./CustomVideoPlayer";
import SharedPostPreview from "./SharedPostPreview";
import ShareModal from "./ShareModal";
import { Dropdown, DropdownItemProps } from "@/components/ui/Dropdown";
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

  const postUserId = post.userId || post.user?._id || post.user?.id;
  const isOwner = Boolean(postUserId && currentUserId && postUserId === currentUserId);
  const commentCount = post.commentsCount || post.comments?.length || 0;

  const { data: friendStatus } = useQuery({
    queryKey: ["friend-status", postUserId],
    queryFn: () => getFriendStatus(postUserId),
    enabled: Boolean(isAuthenticated && postUserId && !isOwner),
    staleTime: 60 * 1000,
  });

  const isFollowing = friendStatus === "request_sent" || friendStatus === "friends";

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

  const deleteMutation = useMutation({
    mutationFn: () => postService.deletePost(post._id || post.id),
    onSuccess: () => {
      toast.success("Post deleted");
      onPostUpdate?.();
    },
    onError: () => toast.error("Failed to delete post"),
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
    // Instant deletion without confirm dialog
    deleteMutation.mutate();
  }, [deleteMutation]);

  const handleEditPost = useCallback(() => {
    if (!editDescription.trim()) {
      toast.error("Please add a description");
      return;
    }
    editMutation.mutate(editDescription);
  }, [editDescription, editMutation]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!checkAuth()) return;
    if (!postUserId) return;

    // Snapshot previous status for rollback if request fails
    const previousStatus = queryClient.getQueryData<string>(["friend-status", postUserId]) || "not_friends";
    const nextStatus = isFollowing ? "not_friends" : "request_sent";

    // 1. Instant Optimistic UI update (0ms latency, exactly like FB/IG)
    queryClient.setQueryData(["friend-status", postUserId], nextStatus);
    toast.success(isFollowing ? "Unfollowed" : "Following!");

    // 2. Background server synchronization
    try {
      if (isFollowing) {
        await unfriend(postUserId);
      } else {
        await sendFriendRequest(postUserId);
      }
    } catch (err: any) {
      // 3. Rollback on failure
      queryClient.setQueryData(["friend-status", postUserId], previousStatus);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update follow status");
    }
  };

  const [isSaved, setIsSaved] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const handleSavePost = useCallback(() => {
    if (!checkAuth()) return;
    setIsSaved((prev) => !prev);
    toast.success(!isSaved ? "Post saved to your bookmarks" : "Post removed from bookmarks");
  }, [checkAuth, isSaved]);

  const handleHidePost = useCallback(() => {
    setIsHidden(true);
    toast.success("Post hidden from feed");
  }, []);

  const handleCopyPostLink = useCallback(() => {
    const url = `${window.location.origin}/post/details/${post._id || post.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  }, [post._id, post.id]);

  const dropdownItems = useMemo(() => {
    const items: DropdownItemProps[] = [
      {
        label: isSaved ? "Unsave Post" : "Save Post",
        icon: <BookmarkIcon className={cn("h-4 w-4", isSaved && "text-[#4E4AFC]")} />,
        onClick: handleSavePost,
      },
      {
        label: "Hide Post",
        icon: <EyeSlashIcon className="h-4 w-4" />,
        onClick: handleHidePost,
      },
      {
        label: "Copy Link",
        icon: <LinkIcon className="h-4 w-4" />,
        onClick: handleCopyPostLink,
      },
    ];

    if (isOwner || user?.role === "ADMIN" || (user?.role as string) === "admin") {
      items.push({
        label: "Edit Post",
        icon: <PencilIcon className="h-4 w-4" />,
        onClick: () => setShowEditModal(true),
      });
      items.push({
        label: "Delete Post",
        icon: <TrashIcon className="h-4 w-4" />,
        onClick: handleDeletePost,
        danger: true,
      });
    }
    return items;
  }, [isSaved, handleSavePost, handleHidePost, handleCopyPostLink, isOwner, user?.role, handleDeletePost]);

  const authorName = post.userName || post.user?.fullName || "User";
  const authorUsername =
    post.user?.username ||
    post.username ||
    authorName.toLowerCase().replace(/\s+/g, "");
  const communityTag = `s/${authorUsername}`;
  const authorPic = post.userProfilePicture || post.user?.profilePicture?.url;
  const mediaUrl = post.mediaUrl || post.media?.url;
  const mediaType = post.mediaType || post.media?.resourceType || "image";

  if (isHidden) {
    return (
      <article className="py-3 px-4 sm:px-6 text-xs text-slate-500 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <span>Post hidden from feed</span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-[#4E4AFC] hover:underline cursor-pointer"
        >
          Undo
        </button>
      </article>
    );
  }

  return (
    <article className="py-4 px-4 sm:px-6 hover:bg-slate-50/50 transition-colors border-b border-slate-100 bg-white">
      {/* Top Header: Subreddit/Author + Time + Follow Button + Options Menu */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            onClick={() => router.push(`/s/${authorUsername}`)}
            className="cursor-pointer shrink-0"
          >
            <Avatar src={authorPic} name={authorName} size={36} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/s/${authorUsername}`)}
                className="font-normal text-xs text-slate-900 hover:text-[#4E4AFC] transition-colors truncate cursor-pointer"
              >
                {communityTag}
              </button>
              {!isOwner && (
                <button
                  onClick={handleFollow}
                  className={cn(
                    "px-2.5 py-0.5 text-xs font-normal rounded-md transition-colors cursor-pointer flex items-center gap-1",
                    isFollowing
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white"
                  )}
                >
                  {isFollowing ? "Following" : "Follow +"}
                </button>
              )}
            </div>
            <span className="text-slate-400 text-xs shrink-0">
              {getTimeAgo(post.createdAt)}
            </span>
          </div>
        </div>

        {!hideMenu && dropdownItems.length > 0 && (
          <Dropdown
            align="right"
            trigger={
              <button
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Post options"
              >
                <EllipsisHorizontalIcon className="h-5 w-5 text-slate-700 stroke-[2]" />
              </button>
            }
            items={dropdownItems}
          />
        )}
      </div>

      {/* Post Title & Description (SlothUI Style) */}
      <div className="mt-2.5">
        <h2
          onClick={goToPostDetails}
          className="font-normal text-base text-slate-900 hover:text-[#4E4AFC] transition-colors cursor-pointer leading-snug"
        >
          {post.title || post.description || "Untitled Post"}
        </h2>

        {post.description && post.title && (
          <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-3">
            {post.description}
          </p>
        )}
      </div>

      {/* Media or Shared Post Preview */}
      {isSharedPost ? (
        <div className="mt-3">
          <SharedPostPreview
            originalPost={originalPost}
            postUrl={sharePreview.postUrl}
            onClick={() => {
              const targetId = originalPost?._id || originalPost?.id || post._id || post.id;
              if (targetId) router.push(`/post/details/${targetId}`);
            }}
          />
        </div>
      ) : mediaUrl ? (
        <div
          className="mt-3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer group"
          onClick={goToPostDetails}
        >
          {mediaType === "video" ? (
            <CustomVideoPlayer src={mediaUrl} poster={post.mediaThumbnail || post.media?.thumbnailUrl} />
          ) : (
            <Image
              src={mediaUrl}
              alt={post.description || "Post media"}
              width={800}
              height={500}
              loading="lazy"
              unoptimized
              className="w-full object-cover max-h-[480px]"
            />
          )}
        </div>
      ) : null}

      {/* SlothUI / Reddit-Style Pill Actions Bar */}
      <div className="flex items-center gap-2 mt-3.5">
        {/* Upvote/Downvote Pill */}
        <div className="inline-flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-md px-3 py-1 text-xs font-normal text-slate-700 transition-colors">
          <button
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={cn(
              "hover:text-[#4E4AFC] transition-colors p-0.5 cursor-pointer",
              isLiked && "text-[#4E4AFC] font-normal"
            )}
            aria-label="Upvote"
          >
            <ArrowUpIcon className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
          <span className="px-2 min-w-[20px] text-center">{likeCount}</span>
          <button
            onClick={handleLike}
            className="hover:text-red-600 transition-colors p-0.5 cursor-pointer"
            aria-label="Downvote"
          >
            <ArrowDownIcon className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Comment Pill */}
        <button
          onClick={handleComment}
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-md px-3 py-1 text-xs font-normal text-slate-700 transition-colors cursor-pointer"
        >
          <ChatBubbleLeftIcon className="h-3.5 w-3.5 stroke-[2]" />
          <span>{commentCount}</span>
        </button>

        {/* Share Pill */}
        <button
          onClick={handleSharePost}
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-md px-3 py-1 text-xs font-normal text-slate-700 transition-colors cursor-pointer"
        >
          <ShareIcon className="h-3.5 w-3.5 stroke-[2]" />
          <span>Share</span>
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          post={post}
          user={user}
          sharePreview={sharePreview}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Post"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditPost}
              loading={editMutation.isPending}
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
    </article>
  );
});

PostCard.displayName = "PostCard";
export default PostCard;
