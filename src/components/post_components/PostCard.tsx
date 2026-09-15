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
  XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import Avatar from "./Avatar";
import CustomVideoPlayer from "./CustomVideoPlayer";
import SharedPostPreview from "./SharedPostPreview";
import ShareModal from "./ShareModal";

const GLASS_CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "0.5px solid rgba(255,255,255,0.14)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
  borderRadius: 16,
  transition: "opacity 0.2s ease, transform 0.2s ease",
};

const GLASS_MODAL: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "0.5px solid rgba(255,255,255,0.12)",
};

const GLASS_DROPDOWN: React.CSSProperties = {
  background: "rgba(15,15,28,0.90)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  border: "0.5px solid rgba(255,255,255,0.18)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
  animation: "lgFadeDown 0.15s ease-out",
};

const getTimeAgo = (date?: string | Date) => {
  if (!date) return "recently";
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  const intervals: Record<string, number> = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
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
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const postUserId = post.userId || post.user?._id || post.user?.id;
  const isOwner = postUserId === currentUserId;
  const commentCount = post.commentsCount || post.comments?.length || 0;
  const shareCount = post.sharesCount || 0;

  const isSharedPost = useMemo(() => 
    !!(post.isShare || post.originalPost || post.sharedPost || post.sharedPostId || post.type === "share"), 
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
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler, { passive: true });
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

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
        refetchType: "none"
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
      return axiosInstance.post(`/users/send-message/${friendId}`, {
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
          sharedByProfilePic: typeof user?.profilePicture === "object" ? user?.profilePicture?.url : user?.profilePicture || user?.avatar,
        }),
        messageType: "share",
      }).then(res => res.data);
    },
    onSuccess: () => {
      toast.success("Post shared via message!");
      setShowShareModal(false);
    },
    onError: () => toast.error("Failed to share via message"),
  });

  const editMutation = useMutation({
    mutationFn: (description: string) => postService.updatePost(post._id || post.id, { description }),
    onSuccess: () => {
      toast.success("Post updated!");
      setShowEditModal(false);
      onPostUpdate?.();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update post"),
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
    setShowMenu(false);
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

  const toggleMenu = useCallback(() => setShowMenu(prev => !prev), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  const actionButtons = useMemo(() => [
    {
      icon: isLiked 
        ? <HeartSolidIcon className="h-5 w-5 text-red-500" /> 
        : <HeartIcon className="h-5 w-5" />,
      count: likeCount,
      onClick: handleLike,
      className: "action-btn like",
      disabled: likeMutation.isPending,
      label: "Like",
    },
    {
      icon: <ChatBubbleLeftIcon className="h-5 w-5" />,
      count: commentCount,
      onClick: handleComment,
      className: "action-btn comment",
      label: "Comment",
    },
    {
      icon: <ShareIcon className="h-5 w-5" />,
      count: shareCount,
      onClick: handleSharePost,
      className: "action-btn share",
      label: "Share",
    },
  ], [isLiked, likeCount, commentCount, shareCount, handleLike, handleComment, handleSharePost, likeMutation.isPending]);

  const menuItems = useMemo(() => [
    { label: "Edit Post", Icon: PencilIcon, onClick: () => { setShowEditModal(true); closeMenu(); }, color: "text-white/75", hover: "hover:bg-white/10 hover:text-white" },
    { label: "Share", Icon: ShareIcon, onClick: handleSharePost, color: "text-white/75", hover: "hover:bg-white/10 hover:text-white" },
    { label: "Delete Post", Icon: TrashIcon, onClick: handleDeletePost, color: "text-red-400", hover: "hover:bg-red-500/15 hover:text-red-300" },
  ], [closeMenu, handleSharePost, handleDeletePost]);

  const authorName = post.userName || post.user?.fullName || "User";
  const authorPic = post.userProfilePicture || post.user?.profilePicture?.url;
  const mediaUrl = post.mediaUrl || post.media?.url;
  const mediaType = post.mediaType || post.media?.resourceType || "image";

  return (
    <>
      <div 
        className={`rounded-2xl overflow-hidden will-change-transform ${isDeleting ? 'animate-exit' : ''}`}
        style={{ ...GLASS_CARD, opacity: isDeleting ? 0.5 : 1, transform: isDeleting ? 'scale(0.98)' : 'scale(1)' }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button 
                onClick={() => router.push(`/profile/${postUserId}`)} 
                className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-full"
                aria-label={`View ${authorName}'s profile`}
              >
                <Avatar src={authorPic} name={authorName} size={44} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => router.push(`/profile/${postUserId}`)} 
                    className="font-semibold text-sm leading-tight transition-colors username hover:text-violet-300"
                    style={{ color: "rgba(255,255,255,0.95)" }}
                    aria-label={`View ${authorName}'s profile`}
                  >
                    {authorName}
                  </button>
                  {isSharedPost && (
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                      shared a post
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {getTimeAgo(post.createdAt)}
                </p>
              </div>
            </div>
            
            {/* Menu Dropdown */}
            {!hideMenu && (isOwner || user?.role === "ADMIN" || (user?.role as string) === "admin") && (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={toggleMenu}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-white/55 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  aria-label="Post options"
                  aria-expanded={showMenu}
                >
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
                
                {showMenu && (
                  <div 
                    className="absolute right-0 mt-1.5 w-44 rounded-2xl overflow-hidden z-50"
                    style={GLASS_DROPDOWN}
                    role="menu"
                  >
                    {menuItems.map(({ label, Icon, onClick, color, hover }) => (
                      <button
                        key={label}
                        onClick={onClick}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150 text-left ${color} ${hover}`}
                        role="menuitem"
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <p 
              className="mt-3 text-sm leading-relaxed break-words cursor-pointer hover:text-white/95 transition-colors"
              style={{ color: "rgba(255,255,255,0.82)" }}
              onClick={goToPostDetails}
            >
              {post.description}
            </p>
          )}

          {/* Media or Shared Post Preview */}
          <div className="-mx-4 mt-3">
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
                className="rounded-xl overflow-hidden cursor-pointer group"
                onClick={goToPostDetails}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && goToPostDetails()}
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
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ maxHeight: 500 }}
                  />
                )}
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div 
            className="flex items-center justify-around mt-4 pt-3"
            style={{ borderTop: "0.5px solid rgba(255,255,255,0.1)" }}
          >
            {actionButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                disabled={btn.disabled}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-150 ${btn.className} ${btn.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ color: "rgba(255,255,255,0.5)" }}
                aria-label={`${btn.label} ${btn.count}`}
              >
                {btn.icon}
                <span className="text-sm font-medium">{btn.count}</span>
              </button>
            ))}
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

      {/* Edit Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowEditModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={GLASS_MODAL}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.12)" }}>
              <h2 className="text-base font-bold text-white">Edit Post</h2>
              <button 
                onClick={() => { setShowEditModal(false); setEditDescription(post.description || ""); }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-5">
              <textarea 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
                placeholder="What's on your mind?" 
                rows={4} 
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                style={{ ...GLASS_MODAL, borderRadius: 12 }}
                autoFocus
              />
            </div>
            <div className="px-5 pb-5">
              <button 
                onClick={handleEditPost} 
                disabled={editMutation.isPending || !editDescription.trim()}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                style={{ 
                  background: "linear-gradient(135deg,#7c3aed,#2563eb)", 
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)" 
                }}
              >
                {editMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
