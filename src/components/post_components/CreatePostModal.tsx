"use client";

import { useState } from "react";
import { createPost } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

export default function CreatePostModal({
  onClose,
  onPostCreated,
}: {
  onClose: () => void;
  onPostCreated: (post: IPost) => void;
}) {
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Please enter post content");
      return;
    }

    setLoading(true);
    try {
      const newPostRes = await createPost({
        description: content,
        media: mediaUrl.trim() ? [mediaUrl.trim()] : undefined,
      } as any);
      toast.success("Post published!");
      if (newPostRes.data) {
        onPostCreated(newPostRes.data);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <h3 className="font-normal text-lg text-gray-900 dark:text-white">Create Post</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4E4AFC]"
          />

          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-gray-400" />
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4E4AFC]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-normal text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-normal bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
              {loading ? "Publishing..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
