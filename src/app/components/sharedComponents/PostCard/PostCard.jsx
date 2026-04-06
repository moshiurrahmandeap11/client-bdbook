// PostCard.jsx - Updated to use extracted ShareModal
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

// ✅ Import extracted components



import Avatar from "../../postsComponents/Avatar";
import CustomVideoPlayer from "../../postsComponents/CustomVideoPlayer";
import SharedPostPreview from "../../postsComponents/SharedPostPreview";
import ShareModal from "../../postsComponents/ShareModal";

// ── Liquid Glass style tokens ────────────────────────────────────────────────
const BDF = "blur(40px) saturate(180%)";
const BDF_LIGHT = "blur(20px) saturate(160%)";

const glassCard = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: BDF_LIGHT,
  WebkitBackdropFilter: BDF_LIGHT,
  border: "0.5px solid rgba(255,255,255,0.14)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
};

const glassInner = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: BDF_LIGHT,
  WebkitBackdropFilter: BDF_LIGHT,
  border: "0.5px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const glassDropdown = {
  background: "rgba(15,15,28,0.90)",
  backdropFilter: BDF,
  WebkitBackdropFilter: BDF,
  border: "0.5px solid rgba(255,255,255,0.18)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
};

// ── MAIN POST CARD COMPONENT ─────────────────────────────────────────────────
const PostCard = memo(({ post, onPostUpdate, hideMenu = false }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isLiked, setIsLiked] = useState(() => post.likes?.includes(user?._id) || post.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef(null);
  const isOwner = post.userId === user?._id;
  const commentCount = post.commentsCount || 0;
  const shareCount = post.sharesCount || 0;

  const isSharedPost = !!(post.isShare || post.originalPost || post.sharedPost || post.sharedPostId || post.type === "share");
  const originalPost = useMemo(() => post.originalPost || post.sharedPost || null, [post]);

  const sharePreview = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const postUrl = `${origin}/post/details/${originalPost?._id || post._id}`;
    const text = post.description || originalPost?.description || "Shared a post";
    return { postUrl, text };
  }, [post, originalPost]);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getTimeAgo = useCallback((date) => {
    if (!date) return "recently";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [unit, s] of Object.entries(intervals)) {
      const n = Math.floor(seconds / s);
      if (n >= 1) return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
    }
    return "just now";
  }, []);

  const checkAuth = useCallback(() => {
    if (!isAuthenticated) { toast.error("Please login to continue"); router.push("/auth/login"); return false; }
    return true;
  }, [isAuthenticated, router]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => { const res = await axiosInstance.post(`/posts/${post._id}/like`); return res.data; },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      queryClient.setQueryData(["posts"], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.map((p) => p._id === post._id ? { ...p, likes: p.likes?.includes(user?._id) ? p.likes.filter((id) => id !== user?._id) : [...(p.likes || []), user?._id], likesCount: p.likes?.includes(user?._id) ? p.likesCount - 1 : p.likesCount + 1 } : p) })) };
      });
      setIsLiked((prev) => !prev); setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
      return { previousPosts };
    },
    onError: (err, vars, context) => {
      if (context?.previousPosts) queryClient.setQueryData(["posts"], context.previousPosts);
      setIsLiked((prev) => !prev); setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      toast.error("Failed to like post");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: 'inactive' }),
  });

  // Share mutations
  const shareToFeedMutation = useMutation({
    mutationFn: async () => {
      const postId = String(post._id)?.trim();
      const res = await axiosInstance.post(`/posts/${postId}/share`);
      return res.data;
    },
    onSuccess: () => { toast.success("Post shared to your feed!"); queryClient.invalidateQueries({ queryKey: ["posts"] }); setShowShareModal(false); onPostUpdate?.(); },
    onError: (err) => { console.error('Share error:', err.response?.data); toast.error(err.response?.data?.message || "Failed to share post"); },
  });

  const shareToMessageMutation = useMutation({
    mutationFn: async (friendId) => {
      const postId = String(post._id)?.trim();
      const res = await axiosInstance.post(`/users/send-message/${friendId}`, {
        message: JSON.stringify({ type: "post_share", postId, postUrl: sharePreview.postUrl, postText: post.description, postAuthor: post.userName, postAuthorProfilePic: post.userProfilePicture, hasMedia: !!post.media?.url, mediaType: post.media?.resourceType, mediaUrl: post.media?.url, sharedBy: user?.fullName, sharedByProfilePic: user?.profilePicture?.url }),
        messageType: "share",
      });
      return res.data;
    },
    onSuccess: () => { toast.success("Post shared via message!"); setShowShareModal(false); },
    onError: (err) => { console.error('Share message error:', err.response?.data); toast.error("Failed to share via message"); },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (description) => { const res = await axiosInstance.patch(`/posts/${post._id}`, { description }); return res.data; },
    onSuccess: () => { toast.success("Post updated!"); setShowEditModal(false); queryClient.invalidateQueries({ queryKey: ["posts"] }); onPostUpdate?.(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update post"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.delete(`/posts/${post._id}`);
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      queryClient.setQueryData(["posts"], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.filter((p) => p._id !== post._id) })) };
      });
      toast.success("Post deleted", { duration: 2500, style: { background: "rgba(30,30,46,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" } });
      return { previousPosts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "inactive" });
      onPostUpdate?.();
    },
    onError: (err, vars, context) => {
      if (context?.previousPosts) queryClient.setQueryData(["posts"], context.previousPosts);
      toast.error("Failed to delete post");
    },
  });

  const handleLike = useCallback(() => { if (!checkAuth()) return; likeMutation.mutate(); }, [checkAuth, likeMutation]);
  const goToPostDetails = useCallback(() => { router.push(`/post/details/${post._id}`); }, [router, post._id]);
  const handleComment = useCallback(() => { if (!checkAuth()) return; goToPostDetails(); }, [checkAuth, goToPostDetails]);
  const handleSharePost = useCallback(() => { if (!checkAuth()) return; setShowShareModal(true); setShowMenu(false); }, [checkAuth]);
  const handleDeletePost = useCallback(() => { setIsDeleting(true); deleteMutation.mutate(); }, [deleteMutation]);
  const handleEditPost = useCallback(() => { if (!editDescription.trim()) { toast.error("Please add a description"); return; } editMutation.mutate(editDescription); }, [editDescription, editMutation]);

  return (
    <>
      <div className={`rounded-2xl overflow-hidden transition-all duration-200 will-change-transform ${isDeleting ? 'animate-exit' : ''}`} style={{ ...glassCard, borderRadius: 16, opacity: isDeleting ? 0.5 : 1, transform: isDeleting ? 'scale(0.98)' : 'scale(1)' }}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <button onClick={() => router.push(`/profile/${post.userId}`)} className="flex-shrink-0">
                <Avatar src={post.userProfilePicture} name={post.userName} size={44} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => router.push(`/profile/${post.userId}`)} className="font-semibold text-sm leading-tight transition" style={{ color: "rgba(255,255,255,0.95)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#c4b5fd")} onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.95)")}>
                    {post.userName}
                  </button>
                  {isSharedPost && <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>shared a post</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{getTimeAgo(post.createdAt)}</p>
              </div>
            </div>
            {!hideMenu && (isOwner || user?.role === "admin") && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu((p) => !p)} className="w-8 h-8 rounded-full flex items-center justify-center transition" style={{ color: "rgba(255,255,255,0.55)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-1.5 w-44 rounded-2xl overflow-hidden z-50" style={{ ...glassDropdown, animation: "lgFadeDown 0.15s ease-out" }}>
                    {[
                      { label: "Edit Post", Icon: PencilIcon, onClick: () => { setShowEditModal(true); setShowMenu(false); }, color: "rgba(255,255,255,0.75)" },
                      { label: "Share", Icon: ShareIcon, onClick: handleSharePost, color: "rgba(255,255,255,0.75)" },
                      { label: "Delete Post", Icon: TrashIcon, onClick: handleDeletePost, color: "#f87171", hover: "rgba(239,68,68,0.12)" },
                    ].map(({ label, Icon, onClick, color, hover }) => (
                      <button key={label} onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150 text-left" style={{ color }} onMouseEnter={(e) => { e.currentTarget.style.background = hover || "rgba(255,255,255,0.08)"; if (!hover) e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = color; }}>
                        <Icon className="h-4 w-4 flex-shrink-0" />{label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <p className="mt-3 text-sm leading-relaxed break-words cursor-pointer" style={{ color: "rgba(255,255,255,0.82)" }} onClick={goToPostDetails}>
              {post.description}
            </p>
          )}

          {/* Media or Shared Post Preview */}
          {isSharedPost ? (
            <SharedPostPreview originalPost={originalPost} postUrl={sharePreview.postUrl} onClick={() => { if (originalPost?._id) router.push(`/post/details/${originalPost._id}`); else router.push(sharePreview.postUrl); }} />
          ) : (
            post.media?.url && (
              <div className="rounded-xl overflow-hidden -mx-4 mt-3 cursor-pointer" onClick={goToPostDetails}>
                {post.media.resourceType === "video" ? (
                  <CustomVideoPlayer src={post.media.url} poster={post.media.thumbnailUrl} />
                ) : (
                  <Image src={post.media.url} alt="Post media" width={800} height={600} loading="lazy" className="w-full object-cover" style={{ maxHeight: 500 }} onClick={(e) => { e.stopPropagation(); goToPostDetails(); }} />
                )}
              </div>
            )
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-around mt-4 pt-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
            {[
              { icon: isLiked ? <HeartSolidIcon className="h-5 w-5" style={{ color: "#ef4444" }} /> : <HeartIcon className="h-5 w-5" />, count: likeCount, onClick: handleLike, hoverColor: "#f87171", disabled: likeMutation.isPending },
              { icon: <ChatBubbleLeftIcon className="h-5 w-5" />, count: commentCount, onClick: handleComment, hoverColor: "#c4b5fd" },
              { icon: <ShareIcon className="h-5 w-5" />, count: shareCount, onClick: handleSharePost, hoverColor: "#4ade80" },
            ].map(({ icon, count, onClick, hoverColor, disabled }, i) => (
              <button key={i} onClick={onClick} disabled={disabled} className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-150 disabled:opacity-50" style={{ color: "rgba(255,255,255,0.5)" }} onMouseEnter={(e) => { e.currentTarget.style.color = hoverColor; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent"; }}>
                {icon}<span className="text-sm font-medium">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ Reusable ShareModal */}
      {showShareModal && (
        <ShareModal
          post={post}
          user={user}
          sharePreview={sharePreview}
          onClose={() => setShowShareModal(false)}
          onShareToFeed={() => shareToFeedMutation.mutate()}
          onShareToMessage={(friendId) => shareToMessageMutation.mutate(friendId)}
          onCopyLink={(url) => {}}
          isSharingToFeed={shareToFeedMutation.isPending}
          isSharingToMessage={shareToMessageMutation.isPending}
        />
      )}

      {/* Edit Modal (inline - can also be extracted if needed) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden" style={glassModal}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.12)" }}>
              <h2 className="text-base font-bold text-white">Edit Post</h2>
              <button onClick={() => { setShowEditModal(false); setEditDescription(post.description || ""); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-5">
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What's on your mind?" rows={4} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none" style={{ ...glassInner, borderRadius: 12 }} />
            </div>
            <div className="px-5 pb-5">
              <button onClick={handleEditPost} disabled={editMutation.isPending} className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50" style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
                {editMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes lgFadeDown { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes exit { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.98); } 100% { opacity: 0; transform: scale(0.95); height: 0; margin: 0; padding: 0; } }
        .animate-exit { animation: exit 0.25s ease-out forwards; }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.35) !important; }
        .will-change-transform { will-change: transform; }
        video::-webkit-media-controls, video::-webkit-media-controls-enclosure, video::-webkit-media-controls-panel { display: none !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; transition: background 0.2s; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </>
  );
});
PostCard.displayName = 'PostCard';
export default PostCard;