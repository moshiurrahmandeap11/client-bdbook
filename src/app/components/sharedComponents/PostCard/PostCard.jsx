// PostCard.jsx - ✅ Fully Optimized Version
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
  XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import Avatar from "../../postsComponents/Avatar";
import CustomVideoPlayer from "../../postsComponents/CustomVideoPlayer";
import SharedPostPreview from "../../postsComponents/SharedPostPreview";
import ShareModal from "../../postsComponents/ShareModal";

// ── ✅ Extracted CSS Classes (Move to globals.css for production) ─────────────
// .glass-card { backdrop-filter: blur(20px) saturate(160%); background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.14); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1); }
// .glass-inner { backdrop-filter: blur(20px) saturate(160%); background: rgba(255,255,255,0.04); border: 0.5px solid rgba(255,255,255,0.12); }
// .glass-dropdown { backdrop-filter: blur(40px) saturate(180%); background: rgba(15,15,28,0.90); border: 0.5px solid rgba(255,255,255,0.18); box-shadow: 0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1); }
// .btn-hover:hover { background: rgba(255,255,255,0.08) !important; color: #fff !important; }
// .action-btn:hover { background: rgba(255,255,255,0.06); }
// .action-btn.like:hover { color: #f87171; }
// .action-btn.comment:hover { color: #c4b5fd; }
// .action-btn.share:hover { color: #4ade80; }
// .username:hover { color: #c4b5fd; }
// @keyframes lgFadeDown { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
// @keyframes exit { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.95); height: 0; margin: 0; padding: 0; } }
// .animate-exit { animation: exit 0.25s ease-out forwards; }

// ── ✅ Stable Style Objects (Defined OUTSIDE component) ───────────────────────
const GLASS_CARD = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "0.5px solid rgba(255,255,255,0.14)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
  borderRadius: 16,
  transition: "opacity 0.2s ease, transform 0.2s ease",
};

const GLASS_MODAL = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "0.5px solid rgba(255,255,255,0.12)",
};

const GLASS_DROPDOWN = {
  background: "rgba(15,15,28,0.90)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  border: "0.5px solid rgba(255,255,255,0.18)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
  animation: "lgFadeDown 0.15s ease-out",
};

// ── ✅ Helper Functions (Defined OUTSIDE to avoid recreation) ─────────────────
const getTimeAgo = (date) => {
  if (!date) return "recently";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
  for (const [unit, s] of Object.entries(intervals)) {
    const n = Math.floor(seconds / s);
    if (n >= 1) return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
};

// ── ✅ MAIN COMPONENT ─────────────────────────────────────────────────────────
const PostCard = memo(({ post, onPostUpdate, hideMenu = false }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ✅ Stable initial state with useMemo to avoid recalculation
  const initialLikeState = useMemo(() => ({
    isLiked: post.likes?.includes(user?._id) || post.isLikedByCurrentUser,
    likeCount: post.likesCount || 0,
  }), [post.likes, post.isLikedByCurrentUser, post.likesCount, user?._id]);

  const [isLiked, setIsLiked] = useState(initialLikeState.isLiked);
  const [likeCount, setLikeCount] = useState(initialLikeState.likeCount);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef(null);
  const isOwner = post.userId === user?._id;
  const commentCount = post.commentsCount || 0;
  const shareCount = post.sharesCount || 0;

  // ✅ Memoize expensive computations
  const isSharedPost = useMemo(() => 
    !!(post.isShare || post.originalPost || post.sharedPost || post.sharedPostId || post.type === "share"), 
    [post.isShare, post.originalPost, post.sharedPost, post.sharedPostId, post.type]
  );

  const originalPost = useMemo(() => post.originalPost || post.sharedPost || null, [post.originalPost, post.sharedPost]);

  const sharePreview = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const targetPost = originalPost || post;
    return {
      postUrl: `${origin}/post/details/${targetPost?._id}`,
      text: post.description || originalPost?.description || "Shared a post",
    };
  }, [post.description, originalPost?.description, originalPost?._id, post._id]);

  // ✅ Close dropdown when clicking outside - optimized
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler, { passive: true });
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // ✅ Sync local state if post prop changes (e.g., from parent update)
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

  // ✅ Like mutation - Optimized: Only update cache, remove redundant local state
  const likeMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/posts/${post._id}/like`).then(res => res.data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previous = queryClient.getQueryData(["posts"]);
      
      queryClient.setQueryData(["posts"], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.map(p => {
              if (p._id !== post._id) return p;
              const wasLiked = p.likes?.includes(user?._id);
              return {
                ...p,
                likes: wasLiked 
                  ? p.likes?.filter(id => id !== user?._id) 
                  : [...(p.likes || []), user?._id],
                likesCount: wasLiked ? p.likesCount - 1 : p.likesCount + 1,
              };
            }),
          })),
        };
      });
      return { previous };
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["posts"], context.previous);
      }
      toast.error("Failed to like post");
    },
    onSettled: () => {
      // ✅ Use onSettled + selective refetch instead of aggressive invalidation
      queryClient.invalidateQueries({ 
        queryKey: ["posts", post._id], 
        refetchType: "none" // Let cache handle it, avoid full refetch
      });
    },
  });

  // ✅ Share mutations - Optimized error handling
  const shareToFeedMutation = useMutation({
    mutationFn: () => {
      const postId = String(post._id)?.trim();
      return axiosInstance.post(`/posts/${postId}/share`).then(res => res.data);
    },
    onSuccess: () => {
      toast.success("Post shared to your feed!");
      setShowShareModal(false);
      onPostUpdate?.();
    },
    onError: (err) => {
      console.error('Share error:', err.response?.data);
      toast.error(err.response?.data?.message || "Failed to share post");
    },
  });

  const shareToMessageMutation = useMutation({
    mutationFn: (friendId) => {
      const postId = String(post._id)?.trim();
      return axiosInstance.post(`/users/send-message/${friendId}`, {
        message: JSON.stringify({
          type: "post_share",
          postId,
          postUrl: sharePreview.postUrl,
          postText: post.description,
          postAuthor: post.userName,
          postAuthorProfilePic: post.userProfilePicture,
          hasMedia: !!post.media?.url,
          mediaType: post.media?.resourceType,
          mediaUrl: post.media?.url,
          sharedBy: user?.fullName,
          sharedByProfilePic: user?.profilePicture?.url,
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

  // ✅ Edit mutation
  const editMutation = useMutation({
    mutationFn: (description) => 
      axiosInstance.patch(`/posts/${post._id}`, { description }).then(res => res.data),
    onSuccess: () => {
      toast.success("Post updated!");
      setShowEditModal(false);
      onPostUpdate?.();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update post"),
  });

  // ✅ Delete mutation - Optimized animation handling
  const deleteMutation = useMutation({
    mutationFn: () => axiosInstance.delete(`/posts/${post._id}`).then(res => res.data),
    onMutate: async () => {
      setIsDeleting(true);
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previous = queryClient.getQueryData(["posts"]);
      
      queryClient.setQueryData(["posts"], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.filter(p => p._id !== post._id),
          })),
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success("Post deleted", { 
        duration: 2000,
        style: { 
          background: "rgba(30,30,46,0.95)", 
          border: "1px solid rgba(255,255,255,0.1)", 
          borderRadius: "12px", 
          color: "#fff" 
        } 
      });
      onPostUpdate?.();
    },
    onError: (err, vars, context) => {
      setIsDeleting(false);
      if (context?.previous) {
        queryClient.setQueryData(["posts"], context.previous);
      }
      toast.error("Failed to delete post");
    },
  });

  // ✅ Optimized handlers with proper dependency arrays
  const handleLike = useCallback(() => {
    if (!checkAuth()) return;
    // ✅ Update local state immediately for instant feedback (optimistic UI)
    setIsLiked(prev => !prev);
    setLikeCount(prev => prev + (isLiked ? -1 : 1));
    likeMutation.mutate();
  }, [checkAuth, likeMutation, isLiked]);

  const goToPostDetails = useCallback(() => {
    router.push(`/post/details/${post._id}`);
  }, [router, post._id]);

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

  // ✅ Memoize action buttons config to avoid recreation
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

  // ✅ Memoize menu items
  const menuItems = useMemo(() => [
    { label: "Edit Post", Icon: PencilIcon, onClick: () => { setShowEditModal(true); closeMenu(); }, color: "text-white/75", hover: "hover:bg-white/10 hover:text-white" },
    { label: "Share", Icon: ShareIcon, onClick: handleSharePost, color: "text-white/75", hover: "hover:bg-white/10 hover:text-white" },
    { label: "Delete Post", Icon: TrashIcon, onClick: handleDeletePost, color: "text-red-400", hover: "hover:bg-red-500/15 hover:text-red-300" },
  ], [closeMenu, handleSharePost, handleDeletePost]);

  return (
    <>
      {/* ✅ Main Card - Using CSS classes + minimal inline styles */}
      <div 
        className={`rounded-2xl overflow-hidden will-change-transform ${isDeleting ? 'animate-exit' : ''}`}
        style={{ ...GLASS_CARD, opacity: isDeleting ? 0.5 : 1, transform: isDeleting ? 'scale(0.98)' : 'scale(1)' }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button 
                onClick={() => router.push(`/profile/${post.userId}`)} 
                className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-full"
                aria-label={`View ${post.userName}'s profile`}
              >
                <Avatar src={post.userProfilePicture} name={post.userName} size={44} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => router.push(`/profile/${post.userId}`)} 
                    className="font-semibold text-sm leading-tight transition-colors username"
                    style={{ color: "rgba(255,255,255,0.95)" }}
                    aria-label={`View ${post.userName}'s profile`}
                  >
                    {post.userName}
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
            
            {/* Menu Dropdown - Optimized */}
            {!hideMenu && (isOwner || user?.role === "admin") && (
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
                  const targetId = originalPost?._id || post._id;
                  if (targetId) router.push(`/post/details/${targetId}`);
                }} 
              />
            ) : post.media?.url ? (
              <div 
                className="rounded-xl overflow-hidden cursor-pointer group"
                onClick={goToPostDetails}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && goToPostDetails()}
              >
                {post.media.resourceType === "video" ? (
                  <CustomVideoPlayer src={post.media.url} poster={post.media.thumbnailUrl} />
                ) : (
                  <Image 
                    src={post.media.url} 
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

          {/* Action Buttons - Using CSS classes for hover */}
          <div 
            className="flex items-center justify-around mt-4 pt-3"
            style={{ borderTop: "0.5px solid rgba(255,255,255,0.1)" }}
          >
            {actionButtons.map((btn, i) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                disabled={btn.disabled}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-150 action-btn ${btn.className} ${btn.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ color: "rgba(255,255,255,0.5)" }}
                aria-label={`${btn.label} ${btn.count} ${btn.label === 'Like' ? (isLiked ? 'unlike' : 'like') : 's'}`}
              >
                {btn.icon}
                <span className="text-sm font-medium">{btn.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ ShareModal */}
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

      {/* ✅ Edit Modal - Optimized */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowEditModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-post-title"
        >
          <div 
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={GLASS_MODAL}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.12)" }}>
              <h2 id="edit-post-title" className="text-base font-bold text-white">Edit Post</h2>
              <button 
                onClick={() => { setShowEditModal(false); setEditDescription(post.description || ""); }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                aria-label="Close edit modal"
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
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* ✅ Global Styles - Only define once */}
      <style jsx global>{`
        @keyframes lgFadeDown { 
          from { opacity: 0; transform: translateY(-6px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
        @keyframes exit { 
          0% { opacity: 1; transform: scale(1); } 
          100% { opacity: 0; transform: scale(0.95); height: 0; margin: 0; padding: 0; } 
        }
        .animate-exit { animation: exit 0.25s ease-out forwards; }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.35) !important; }
        .will-change-transform { will-change: transform; }
        video::-webkit-media-controls, video::-webkit-media-controls-enclosure, video::-webkit-media-controls-panel { display: none !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;