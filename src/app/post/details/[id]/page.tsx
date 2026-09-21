// Comment submission error rollback
"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IPost, IComment } from "@/interfaces";
import { postService } from "@/services/post.service";
import PostCard from "@/components/post_components/PostCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { ArrowLeft, MessageSquare, Send, User as UserIcon } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

function getTimeAgo(dateString: string | Date | undefined): string {
  if (!dateString) return "just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PostDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState<IPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const data = await postService.getPostById(postId);
      setPost(data);
    } catch (err) {
      console.error("Failed to load post details:", err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to comment");
      router.push("/auth/login");
      return;
    }

    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await postService.commentPost(postId, commentText.trim());
      setCommentText("");
      toast.success("Comment added!");
      // Refresh post to show new comment
      await fetchPost();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#4E4AFC] mb-3"></div>
        <p className="text-sm text-slate-500 font-normal">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <MessageSquare className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-medium text-slate-800">Post not found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-normal">
          This post could not be found or may have been deleted.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white text-xs font-normal rounded-md transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Feed</span>
        </button>
      </div>
    );
  }

  const comments: IComment[] = post.comments || [];

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-normal text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Main Post Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <PostCard post={post} onPostUpdate={fetchPost} />
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-900">
            Comments ({comments.length})
          </h3>
        </div>

        {/* Comment input form */}
        <form onSubmit={handleAddComment} className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full bg-[#4E4AFC]/10 text-[#4E4AFC] flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
            {user && (user.avatar || (user as any).profilePicUrl) ? (
              <img
                src={user.avatar || (user as any).profilePicUrl}
                alt={user.fullName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                isAuthenticated ? "Write a comment..." : "Log in to comment"
              }
              disabled={!isAuthenticated || submittingComment}
              className="flex-1 px-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-md border border-slate-200 focus:outline-none focus:border-[#4E4AFC] transition-colors"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="px-4 py-2 bg-[#4E4AFC] hover:bg-[#3F3BE6] disabled:opacity-50 disabled:hover:bg-[#4E4AFC] text-white text-xs font-normal rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </div>
        </form>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-normal">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4 pt-2 divide-y divide-slate-100">
            {comments.map((comment) => {
              const cUser = comment.user;
              const cAvatar =
                cUser?.avatar ||
                cUser?.profilePicUrl ||
                (typeof cUser?.profilePicture === "object"
                  ? cUser?.profilePicture?.url
                  : cUser?.profilePicture);
              const cName = cUser?.fullName || cUser?.name || "User";
              const cUsername = cUser?.username || cUser?.id || cUser?._id;

              return (
                <div
                  key={comment.id || comment._id}
                  className="pt-4 first:pt-0 flex gap-3 items-start"
                >
                  <Link
                    href={`/s/${cUsername}`}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200"
                  >
                    {cAvatar ? (
                      <img
                        src={cAvatar}
                        alt={cName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-normal text-[#4E4AFC]">
                        {cName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Link
                        href={`/s/${cUsername}`}
                        className="text-xs font-medium text-slate-900 hover:text-[#4E4AFC] transition-colors truncate"
                      >
                        {cName}
                        {cUser?.username && (
                          <span className="ml-1.5 font-normal text-slate-400">
                            @{cUser.username}
                          </span>
                        )}
                      </Link>
                      <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                        {getTimeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-normal leading-relaxed break-words whitespace-pre-wrap">
                      {comment.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
