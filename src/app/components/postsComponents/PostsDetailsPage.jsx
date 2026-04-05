"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  FaceSmileIcon,
  HeartIcon,
  PaperAirplaneIcon,
  ShareIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmojiPicker from "emoji-picker-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

// ==================== getTimeAgo ====================
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  for (const [unit, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
};

const CommentItem = ({
  comment,
  postId,
  currentUser,
  depth = 0,
  onCommentUpdate,
}) => {
  const queryClient = useQueryClient();

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(true);

  const replies = comment.replies || [];
  const hasReplies = replies.length > 0;

  // ✅ LIMIT depth like Facebook
  const maxDepth = 3;

  const replyMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(`/posts/${postId}/comment`, {
        text: `@${comment.userName} ${replyText}`,
        parentCommentId: comment._id,
      });
    },
    onSuccess: () => {
      setReplyText("");
      setShowReplyInput(false);
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  return (
    <div className="relative">
      {/* 🔥 MAIN THREAD LINE (important) */}
      {depth > 0 && (
        <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-white/10" />
      )}

      <div
        className="flex gap-3"
        style={{
          marginLeft: depth * 20, // 🔥 consistent nesting
        }}
      >
        {/* Avatar */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-500">
            {comment.userProfilePicture && (
              <Image
                src={comment.userProfilePicture}
                alt=""
                width={32}
                height={32}
                className="object-cover"
              />
            )}
          </div>

          {/* 🔥 DOT CONNECTOR */}
          {depth > 0 && (
            <div className="absolute -left-3 top-3 w-2 h-2 bg-white/30 rounded-full" />
          )}
        </div>

        <div className="flex-1">
          {/* Bubble */}
          <div className="bg-[#3a3b3c] px-3 py-2 rounded-2xl inline-block">
            <p className="text-sm font-semibold text-white">
              {comment.userName}
            </p>

            {/* mention highlight */}
            <p className="text-sm text-gray-200">
              {comment.text.split(" ").map((w, i) =>
                w.startsWith("@") ? (
                  <span key={i} className="text-blue-400 mr-1">
                    {w}
                  </span>
                ) : (
                  <span key={i} className="mr-1">
                    {w}
                  </span>
                )
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 text-xs text-gray-400 mt-1 ml-1">
            <span>{getTimeAgo(comment.createdAt)}</span>

            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="hover:text-blue-400"
            >
              Reply
            </button>

            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="hover:text-blue-400"
              >
                {showReplies ? "Hide" : "View"} {replies.length} replies
              </button>
            )}
          </div>

          {/* Reply Input */}
          {showReplyInput && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.userName}`}
                className="bg-[#3a3b3c] px-3 py-2 rounded-full text-sm w-full outline-none"
              />
              <button
                onClick={() => replyMutation.mutate()}
                className="text-blue-400"
              >
                Post
              </button>
            </div>
          )}

          {/* 🔥 REPLIES TREE */}
          {hasReplies && showReplies && depth < maxDepth && (
            <div className="mt-3 space-y-3 relative">
              {/* vertical thread line */}
              <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-white/10" />

              {replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  postId={postId}
                  currentUser={currentUser}
                  depth={depth + 1}
                  onCommentUpdate={onCommentUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ====================== MAIN POST DETAILS PAGE ======================
const PostsDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { data: postData, isLoading, error, refetch } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => (await axiosInstance.get(`/posts/${id}`)).data,
    staleTime: 3 * 60 * 1000,
  });

  const post = postData?.data;

  // Like Mutation
  const likeMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/posts/${id}/like`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["post", id] });
      const previous = queryClient.getQueryData(["post", id]);
      queryClient.setQueryData(["post", id], (old) => {
        const isLiked = old?.data.likes?.includes(user?._id);
        return {
          ...old,
          data: {
            ...old.data,
            likes: isLiked
              ? old.data.likes.filter((u) => u !== user?._id)
              : [...(old.data.likes || []), user?._id],
            likesCount: isLiked ? old.data.likesCount - 1 : old.data.likesCount + 1,
          },
        };
      });
      return { previous };
    },
    onError: (_, __, context) => queryClient.setQueryData(["post", id], context.previous),
  });

  // Comment Mutation
  const commentMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/posts/${id}/comment`, { text: commentText }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      toast.success("Comment added successfully!");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  // Share Mutation
  const shareMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/posts/${id}/share`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      toast.success("Post shared successfully!");
    },
    onError: () => toast.error("Failed to share post"),
  });

  const isLiked = post?.likes?.includes(user?._id);

  if (isLoading) return <PostDetailsSkeleton />;
  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-teal-950 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Post Not Found</h2>
          <button
            onClick={() => router.push("/posts")}
            className="px-6 py-3 bg-purple-600 rounded-2xl hover:bg-purple-700 transition"
          >
            Go Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-teal-950 pb-24 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back</span>
        </button>

        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Post Header */}
          <div className="p-5 border-b border-white/10 flex gap-4">
            <Link href={`/profile/${post.userId}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600">
                {post.userProfilePicture ? (
                  <Image
                    src={post.userProfilePicture}
                    alt={post.userName}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <UserIcon className="h-7 w-7 text-white m-auto mt-2.5" />
                )}
              </div>
            </Link>
            <div>
              <Link href={`/profile/${post.userId}`} className="font-semibold text-lg text-white hover:text-purple-400 transition">
                {post.userName}
              </Link>
              <p className="text-white/50 text-sm">
                {new Date(post.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                {getTimeAgo(post.createdAt)}
              </p>
            </div>
          </div>

          {/* Post Content */}
          <div className="p-5">
            {post.description && (
              <p className="text-white/90 text-[17px] leading-relaxed mb-5 whitespace-pre-wrap">
                {post.description}
              </p>
            )}
            {post.media && (
              <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/10">
                {post.media.resourceType === "video" ? (
                  <video src={post.media.url} controls className="w-full max-h-[520px] object-contain" />
                ) : (
                  <Image
                    src={post.media.url}
                    alt="Post media"
                    width={800}
                    height={600}
                    className="w-full object-cover"
                    unoptimized
                  />
                )}
              </div>
            )}
          </div>

          {/* Post Stats */}
          <div className="px-5 py-4 border-t border-white/10 flex gap-6 text-sm text-white/60">
            <div className="flex items-center gap-1.5">
              <HeartSolidIcon className="h-5 w-5 text-red-500" />
              {post.likesCount} likes
            </div>
            <div>{post.commentsCount} comments</div>
            <div>{post.sharesCount} shares</div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 border-t border-white/10 text-white/70">
            <button
              onClick={() => likeMutation.mutate()}
              className={`py-4 flex items-center justify-center gap-2 hover:bg-white/5 transition ${isLiked ? "text-red-500" : ""}`}
            >
              {isLiked ? <HeartSolidIcon className="h-6 w-6" /> : <HeartIcon className="h-6 w-6" />}
              Like
            </button>
            <button
              onClick={() => document.getElementById("comment-input")?.focus()}
              className="py-4 flex items-center justify-center gap-2 hover:bg-white/5 transition"
            >
              <ChatBubbleLeftIcon className="h-6 w-6" />
              Comment
            </button>
            <button
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              className="py-4 flex items-center justify-center gap-2 hover:bg-white/5 transition disabled:opacity-50"
            >
              <ShareIcon className="h-6 w-6" />
              Share
            </button>
          </div>

          {/* Comments Section */}
          <div className="p-5 border-t border-white/10">
            <h3 className="font-semibold text-lg mb-5 text-white">
              Comments ({post.commentsCount})
            </h3>

            {/* Add Comment Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (commentText.trim()) commentMutation.mutate();
              }}
              className="flex gap-3 mb-8"
            >
              <div className="relative flex-1">
                <input
                  id="comment-input"
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 px-5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <FaceSmileIcon className="h-6 w-6" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker onEmojiClick={(e) => setCommentText((p) => p + e.emoji)} theme="dark" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!commentText.trim() || commentMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 rounded-2xl hover:scale-105 transition disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-6 w-6" />
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              {post.comments.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                post.comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    postId={id}
                    currentUser={user}
                    depth={0}
                    onCommentUpdate={refetch}
                    replyingTo={null}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton Component
const PostDetailsSkeleton = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
    <div className="mb-6 h-10 w-28 bg-white/10 rounded-2xl animate-pulse" />
    <div className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-white/20 rounded w-40 animate-pulse" />
            <div className="h-3 bg-white/20 rounded w-24 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="h-6 bg-white/20 rounded w-3/4 animate-pulse" />
        <div className="aspect-video bg-white/10 rounded-2xl animate-pulse" />
      </div>
    </div>
  </div>
);

export default PostsDetailsPage;