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
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="h-48 bg-[#4E4AFC] relative">
          {user.coverImage && <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />}
        </div>
        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-12 mb-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-[#4E4AFC] text-white font-normal text-3xl flex items-center justify-center overflow-hidden shadow-lg">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-gray-900 dark:text-white">{user.name}</h1>
            {user.bio && <p className="text-sm text-gray-600 dark:text-gray-300">{user.bio}</p>}

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2">
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {user.location}
                </span>
              )}
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#4E4AFC] hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" /> {user.website}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-4">
        <h3 className="font-normal text-lg text-gray-900 dark:text-white">Posts ({userPosts.length})</h3>
        {userPosts.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            No posts published by this user yet.
          </div>
        ) : (
          userPosts.map((post) => <PostCard key={post.id || post._id} post={post} />)
        )}
      </div>
    </div>
  );
}

