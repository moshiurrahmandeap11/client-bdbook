"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    ArrowLeftIcon,
    ChatBubbleLeftIcon,
    HeartIcon,
    PaperAirplaneIcon,
    ShareIcon,
    UserIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const PostsDetailsPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Fetch post details
  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/posts/${id}`);
      if (response.data.success) {
        setPost(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
      toast.error("Failed to load post");
      router.push("/posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to like posts");
      return;
    }

    try {
      const response = await axiosInstance.post(`/posts/${id}/like`);
      if (response.data.success) {
        setPost(prev => ({
          ...prev,
          likes: response.data.data.liked
            ? [...prev.likes, user._id]
            : prev.likes.filter(uid => uid !== user._id),
          likesCount: response.data.data.liked
            ? prev.likesCount + 1
            : prev.likesCount - 1,
        }));
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error("Like error:", error);
      toast.error("Failed to process like");
    }
  };

  // Handle add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to comment");
      return;
    }
    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await axiosInstance.post(`/posts/${id}/comment`, {
        text: commentText,
      });
      if (response.data.success) {
        setPost(prev => ({
          ...prev,
          comments: [...prev.comments, response.data.data],
          commentsCount: prev.commentsCount + 1,
        }));
        setCommentText("");
        toast.success("Comment added successfully");
      }
    } catch (error) {
      console.error("Comment error:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const response = await axiosInstance.delete(`/posts/${id}/comment/${commentId}`);
      if (response.data.success) {
        setPost(prev => ({
          ...prev,
          comments: prev.comments.filter(c => c._id !== commentId),
          commentsCount: prev.commentsCount - 1,
        }));
        toast.success("Comment deleted successfully");
      }
    } catch (error) {
      console.error("Delete comment error:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Handle share post
  const handleShare = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to share posts");
      return;
    }

    setSharing(true);
    try {
      const response = await axiosInstance.post(`/posts/${id}/share`);
      if (response.data.success) {
        setPost(prev => ({
          ...prev,
          sharesCount: prev.sharesCount + 1,
        }));
        toast.success("Post shared successfully!");
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error(error.response?.data?.message || "Failed to share post");
    } finally {
      setSharing(false);
    }
  };

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
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
      }
    }
    return "just now";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back
        </button>

        {/* Post Card */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden">
          {/* Post Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-start gap-3">
              <Link href={`/profile/${post.userId}`}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer">
                  {post.userProfilePicture ? (
                    <Image
                      src={post.userProfilePicture}
                      alt={post.userName}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6 text-white" />
                  )}
                </div>
              </Link>
              <div className="flex-1">
                <Link href={`/profile/${post.userId}`}>
                  <h3 className="font-semibold text-white text-lg hover:text-purple-400 transition">
                    {post.userName}
                  </h3>
                </Link>
                <p className="text-white/40 text-sm">{getTimeAgo(post.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="p-4">
            {post.description && (
              <p className="text-white/90 text-lg mb-4">{post.description}</p>
            )}
            {post.media && (
              <div className="rounded-xl overflow-hidden bg-black/20">
                {post.media.resourceType === "video" ? (
                  <video
                    src={post.media.url}
                    controls
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : (
                  <Image
                    src={post.media.url}
                    alt="Post media"
                    width={800}
                    height={500}
                    className="w-full object-cover max-h-[500px]"
                  />
                )}
              </div>
            )}
          </div>

          {/* Post Stats */}
          <div className="px-4 py-3 border-t border-white/10">
            <div className="flex gap-6">
              <div className="flex items-center gap-1 text-white/60">
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm">{post.likesCount} likes</span>
              </div>
              <div className="flex items-center gap-1 text-white/60">
                <ChatBubbleLeftIcon className="h-5 w-5" />
                <span className="text-sm">{post.commentsCount} comments</span>
              </div>
              <div className="flex items-center gap-1 text-white/60">
                <ShareIcon className="h-5 w-5" />
                <span className="text-sm">{post.sharesCount} shares</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex border-t border-white/10">
            <button
              onClick={handleLike}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-white/70 hover:bg-white/5 transition-colors"
            >
              {post.likes?.includes(user?._id) ? (
                <HeartSolidIcon className="h-6 w-6 text-red-500" />
              ) : (
                <HeartIcon className="h-6 w-6" />
              )}
              <span>Like</span>
            </button>
            <button
              onClick={() => document.getElementById("comment-input")?.focus()}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-white/70 hover:bg-white/5 transition-colors"
            >
              <ChatBubbleLeftIcon className="h-6 w-6" />
              <span>Comment</span>
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <ShareIcon className="h-6 w-6" />
              <span>{sharing ? "Sharing..." : "Share"}</span>
            </button>
          </div>

          {/* Comments Section */}
          <div className="border-t border-white/10 p-4">
            <h4 className="text-white font-semibold mb-4">Comments ({post.commentsCount})</h4>
            
            {/* Add Comment */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
              <input
                id="comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={submittingComment}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {post.comments.length === 0 ? (
                <p className="text-white/60 text-center py-4">No comments yet. Be the first to comment!</p>
              ) : (
                post.comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3">
                    <Link href={`/profile/${comment.userId}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0">
                        {comment.userProfilePicture ? (
                          <Image
                            src={comment.userProfilePicture}
                            alt={comment.userName}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        ) : (
                          <UserIcon className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="bg-white/10 rounded-xl p-3">
                        <Link href={`/profile/${comment.userId}`}>
                          <p className="font-semibold text-white text-sm hover:text-purple-400 transition">
                            {comment.userName}
                          </p>
                        </Link>
                        <p className="text-white/80 text-sm mt-1">{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-2">
                        <span className="text-white/40 text-xs">{getTimeAgo(comment.createdAt)}</span>
                        {(comment.userId === user?._id || user?.role === "admin") && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-white/40 hover:text-red-400 text-xs transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostsDetailsPage;