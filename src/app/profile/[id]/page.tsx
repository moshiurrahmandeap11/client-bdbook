"use client";

import { use, useEffect, useState } from "react";
import { IUser } from "@/types/user.types";
import { IPost } from "@/types/post.types";
import { getUserById } from "@/services/user.service";
import { getFeed } from "@/services/post.service";
import PostCard from "@/components/post_components/PostCard";
import { Calendar, MapPin, Globe } from "lucide-react";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [user, setUser] = useState<IUser | null>(null);
  const [userPosts, setUserPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUserById(userId), getFeed()])
      .then(([userData, feedData]) => {
        setUser(userData);
        setUserPosts(feedData.data.filter((p) => p.userId === userId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="text-center py-12 text-sm text-gray-500">Loading profile...</div>;
  }

  if (!user) {
    return <div className="text-center py-12 text-sm text-gray-500">User not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Banner & Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="h-48 bg-[#4E4AFC] relative">
          {user.coverImage && <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />}
        </div>
        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-12 mb-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-[#4E4AFC] text-white font-normal text-3xl flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
// [wip step 1/2]
