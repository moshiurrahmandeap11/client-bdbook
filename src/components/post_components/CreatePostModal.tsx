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
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
// [wip step 1/2]
