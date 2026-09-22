"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { IPost, IUser } from "@/interfaces";
import { postService } from "@/services/post.service";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  ShareIcon,
  BookmarkIcon,
  EyeSlashIcon,
  LinkIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getFollowStatus, followUser, unfollowUser } from "@/services/follow.service";

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
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);

  useEffect(() => {
    setSharesCount(post.sharesCount || 0);
  }, [post.sharesCount]);

  const postUserId = post.userId || post.user?._id || post.user?.id;
  const isOwner = Boolean(postUserId && currentUserId && postUserId === currentUserId);
  const commentCount = post.commentsCount || post.comments?.length || 0;

  const { data: isFollowing = false } = useQuery<boolean>({
    queryKey: ["follow-status", postUserId],
    queryFn: () => getFollowStatus(postUserId),
    enabled: Boolean(isAuthenticated && postUserId && !isOwner),
    staleTime: 60 * 1000,
  });

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
    onMutate: () => {
      setIsHidden(true);
      toast.success("Post deleted");
      const targetId = post._id || post.id;
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              data: p.data?.filter((item: any) => (item._id || item.id) !== targetId),
            })),
          };
        }
        if (Array.isArray(old)) {
          return old.filter((item: any) => (item._id || item.id) !== targetId);
        }
        return old;
      });
      const pUserId = post.userId || post.user?._id || post.user?.id;
      if (pUserId) {
        queryClient.setQueryData(["user-posts", pUserId], (old: IPost[] | undefined) => {
          return old?.filter((item: any) => (item._id || item.id) !== targetId) || [];
        });
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`stalk_cache_post-${targetId}`);
          sessionStorage.removeItem(`stalk_cache_post-${targetId}`);
        } catch {}
        if (window.location.pathname.includes(targetId)) {
          router.replace("/");
        }
      }
      queryClient.removeQueries({ queryKey: ["post", targetId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      onPostUpdate?.();
    },
    onError: () => {
      setIsHidden(false);
      toast.error("Failed to delete post");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
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

  const shareMutation = useMutation({
    mutationFn: async (desc?: string) => {
      const pId = post._id || post.id;
      return postService.sharePost(pId, { description: desc });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      onPostUpdate?.();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to share post");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      setSharesCount((prev: number) => Math.max(0, prev - 1));
    },
  });

  const handleShareToFeed = useCallback((desc?: string) => {
    if (!checkAuth()) return;
    const currentUserId = user?.id || (user as any)?._id;
    const currentUserName = user?.fullName || (user as any)?.name || "You";
    const currentUserPic =
      typeof user?.profilePicture === "object"
        ? user?.profilePicture?.url
        : user?.profilePicture || (user as any)?.avatar;

    // 1. INSTANT 0ms OPTIMISTIC UI
    setShowShareModal(false);
    toast.success("Post shared to your feed!");
    setSharesCount((prev: number) => prev + 1);

    // 2. Build complete optimistic post with originalPost attached
    const targetOriginal = originalPost || {
      id: post.id || post._id,
      _id: post.id || post._id,
      userId: post.userId || post.user?.id || post.user?._id,
      userName: post.userName || post.user?.fullName || "User",
      userProfilePicture: post.userProfilePicture || post.user?.profilePicture?.url,
      description: post.description || "",
      media: (post.mediaUrl || post.media?.url) ? {
        url: post.mediaUrl || post.media?.url,
        resourceType: post.mediaType || post.media?.resourceType || "image",
      } : null,
    };

    const optimisticPost: IPost = {
      id: `temp-share-${Date.now()}`,
      _id: `temp-share-${Date.now()}`,
      userId: currentUserId,
      userName: currentUserName,
      userProfilePicture: currentUserPic,
      description: desc || "",
      isShare: true,
      isRepost: false,
      originalPost: targetOriginal,
      likes: [],
      likesCount: 0,
      comments: [],
      commentsCount: 0,
      shares: [],
      sharesCount: 0,
      reposts: [],
      repostsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    } as any;

    // 3. Optimistically update React Query in-memory caches
    queryClient.setQueryData(["posts"], (old: any) => {
      if (!old) return old;
      if (old.pages && old.pages.length > 0) {
        const first = old.pages[0];
        return {
          ...old,
          pages: [
            { ...first, data: [optimisticPost, ...(first.data || [])] },
            ...old.pages.slice(1),
          ],
        };
      }
      if (Array.isArray(old)) {
        return [optimisticPost, ...old];
      }
      return old;
    });

    if (currentUserId) {
      queryClient.setQueryData(["user-posts", currentUserId], (old: IPost[] | undefined) => {
        return [optimisticPost, ...(old || [])];
      });
    }

    // 4. Fire mutation in background
    shareMutation.mutate(desc);
  }, [checkAuth, user, originalPost, post, queryClient, shareMutation]);

  const shareToMessageMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const pId = post._id || post.id;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const postUrl = `${origin}/post/details/${pId}`;
      const res = await axiosInstance.post(`/messages/send-message/${friendId}`, {
        message: JSON.stringify({
          type: "post_share",
          postId: pId,
          postUrl,
          postText: post.description || "Check out this post",
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
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Post shared via message!");
      setShowShareModal(false);
    },
    onError: () => toast.error("Failed to share via message"),
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

    const prevFollowing = isFollowing;
    const nextFollowing = !prevFollowing;

    // 1. Instant Optimistic UI update (0ms latency)
    queryClient.setQueryData(["follow-status", postUserId], nextFollowing);
    toast.success(nextFollowing ? "Following!" : "Unfollowed");

    // 2. Background server synchronization
    try {
      if (nextFollowing) {
        await followUser(postUserId);
      } else {
        await unfollowUser(postUserId);
      }
      queryClient.invalidateQueries({ queryKey: ["follow-status", postUserId] });
    } catch (err: any) {
      // 3. Rollback on failure
      queryClient.setQueryData(["follow-status", postUserId], prevFollowing);
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
        icon: <BookmarkIcon className={cn("h-4 w-4", isSaved && "text-primary")} />,
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
  }, [isSaved, isOwner, user?.role, handleSavePost, handleHidePost, handleCopyPostLink, handleDeletePost]);

  const authorName = post.userName || post.user?.fullName || post.user?.name || "Anonymous";
  const authorUsername = post.user?.username || post.userId || post.user?._id || "user";
  const authorPic =
    post.userProfilePicture ||
    (typeof post.user?.profilePicture === "object"
      ? post.user?.profilePicture?.url
      : post.user?.profilePicture || post.user?.avatar);
  const mediaUrl = post.mediaUrl || post.media?.url;
  const mediaType = post.mediaType || post.media?.resourceType || "image";
  const communityTag = `s/${authorUsername}`;

  if (isHidden) {
    return (
      <article className="py-3 px-4 fb-card flex items-center justify-between text-xs text-muted">
        <span>Post hidden</span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-primary hover:underline font-normal cursor-pointer"
        >
          Undo
        </button>
      </article>
    );
  }

  return (
    <article className="py-3.5 fb-card overflow-hidden">
      {/* Top Header: Subreddit/Author + Time + Follow Button + Options Menu */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            onClick={() => router.push(`/s/${authorUsername}`)}
            className="cursor-pointer shrink-0"
          >
            <Avatar src={authorPic} name={authorName} size={40} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/s/${authorUsername}`)}
                className="font-semibold text-[14px] text-foreground hover:underline transition-colors truncate cursor-pointer"
              >
                {communityTag}
              </button>
              {isSharedPost && (
                <span className="text-[11px] text-muted font-normal">
                  shared a post
                </span>
              )}
              {!isOwner && (
                <button
                  onClick={handleFollow}
                  className={cn(
                    "px-2.5 py-0.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1",
                    isFollowing
                      ? "bg-fb-btn text-foreground hover:bg-fb-btn-hover"
                      : "bg-primary hover:bg-primary-hover text-white"
                  )}
                >
                  {isFollowing ? "Following" : "Follow +"}
                </button>
              )}
            </div>
            <span className="text-muted text-xs shrink-0">
              {getTimeAgo(post.createdAt)}
            </span>
          </div>
        </div>

        {!hideMenu && dropdownItems.length > 0 && (
          <Dropdown
            align="right"
            trigger={
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-fb-input transition-colors cursor-pointer"
                aria-label="Post options"
              >
                <EllipsisHorizontalIcon className="h-5 w-5 stroke-[2]" />
              </button>
            }
            items={dropdownItems}
          />
        )}
      </div>

      {/* Post Title & Description */}
      {!isSharedPost ? (
        <div className="mt-2 px-4 sm:px-5">
          {(post.title || post.description) && (
            <h2
              onClick={goToPostDetails}
              className="font-normal text-[15px] text-foreground hover:text-primary transition-colors cursor-pointer leading-snug"
            >
              {post.title || post.description}
            </h2>
          )}

          {post.description && post.title && (
            <p className="mt-1 text-sm text-muted leading-relaxed line-clamp-3">
              {post.description}
            </p>
          )}
        </div>
      ) : post.description ? (
        <div className="mt-2 px-4 sm:px-5">
          <p className="text-[15px] text-foreground leading-relaxed font-normal">
            {post.description}
          </p>
        </div>
      ) : null}

      {/* Media or Shared Post Preview */}
      {isSharedPost ? (
        <div className="mt-2.5 px-4 sm:px-5">
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
          className="mt-2.5 w-full overflow-hidden bg-slate-950 flex items-center justify-center cursor-pointer group"
          onClick={goToPostDetails}
        >
          {mediaType === "video" ? (
            <CustomVideoPlayer
              src={mediaUrl}
              poster={post.mediaThumbnail || post.media?.thumbnailUrl || post.media?.thumbnail}
              maxHeight={580}
              ambientBlur={true}
              allowFitToggle={true}
              className="rounded-none w-full"
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={post.description || "Post media"}
              width={1000}
              height={600}
              loading="lazy"
              unoptimized
              className="w-full object-contain max-h-[520px] bg-slate-950"
            />
          )}
        </div>
      ) : null}

      {/* Facebook Style Action Bar */}
      <div className="border-t border-border mt-3 pt-1 px-4 sm:px-5 flex items-center justify-between">
        {/* Upvote/Downvote Action */}
        <div className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-md hover:bg-fb-input text-muted transition-colors cursor-pointer">
          <button
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={cn(
              "hover:text-primary transition-colors p-0.5 cursor-pointer flex items-center gap-1.5",
              isLiked && "text-primary font-semibold"
            )}
            aria-label="Upvote"
          >
            <ArrowUpIcon className="h-4 w-4 stroke-[2.5]" />
            <span className="text-xs">{likeCount}</span>
          </button>
          <button
            onClick={handleLike}
            className="hover:text-rose-600 transition-colors p-0.5 cursor-pointer ml-1"
            aria-label="Downvote"
          >
            <ArrowDownIcon className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Comment Button */}
        <button
          onClick={handleComment}
          className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-md hover:bg-fb-input text-muted hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
        >
          <ChatBubbleLeftIcon className="h-4 w-4 stroke-[2]" />
          <span>{commentCount > 0 ? `${commentCount} Comments` : "Comment"}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleSharePost}
          className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-md hover:bg-fb-input text-muted hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
        >
          <ShareIcon className="h-4 w-4 stroke-[2]" />
          <span>{sharesCount > 0 ? `${sharesCount} Shares` : "Share"}</span>
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          post={post}
          user={user}
          sharePreview={sharePreview}
          onClose={() => setShowShareModal(false)}
          onShareToFeed={handleShareToFeed}
          onShareToMessage={(friendId: string) => shareToMessageMutation.mutate(friendId)}
          isSharingToFeed={false}
          isSharingToMessage={shareToMessageMutation.isPending}
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
