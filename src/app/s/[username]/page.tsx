"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IUser, IPost } from "@/interfaces";
import { getUserByUsername } from "@/services/user.service";
import { getFeed } from "@/services/post.service";
import PostCard from "@/components/post_components/PostCard";
import { Calendar, MapPin, Globe, User } from "lucide-react";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const username = resolvedParams.username;
  const router = useRouter();

  const [user, setUser] = useState<IUser | null>(null);
  const [userPosts, setUserPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    getUserByUsername(username)
      .then((userData) => {
        if (
          userData?.username &&
          userData.username.toLowerCase() !== username.toLowerCase()
        ) {
          router.replace(`/s/${userData.username}`);
        }
        setUser(userData);
        return getFeed().then((feedData) => {
          const posts = feedData.data || [];
          setUserPosts(
            posts.filter(
              (p) =>
                p.userId === userData.id ||
                p.user?.id === userData.id ||
                p.user?._id === userData.id ||
                (userData.username &&
                  p.user?.username?.toLowerCase() ===
                    userData.username.toLowerCase())
            )
          );
        });
      })
      .catch((err) => {
        console.error("Failed to load user profile:", err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [username, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#4E4AFC] mb-3"></div>
        <p className="text-sm text-slate-500 font-normal">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <User className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-medium text-slate-800">User not found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-normal">
          The user <span className="font-medium text-slate-600">@{username}</span> could not be found or has been deactivated.
        </p>
      </div>
    );
  }

  const userAvatar =
    user.avatar ||
    user.profilePicUrl ||
    (typeof user.profilePicture === "object"
      ? user.profilePicture?.url
      : user.profilePicture);

  const userCover = user.coverImage || user.coverPhotoUrl;
  const displayName = user.fullName || user.name || user.username;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Banner & Header */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">
        {/* Cover Photo */}
        <div className="h-48 sm:h-56 bg-slate-200 relative overflow-hidden">
          {userCover ? (
            <img
              src={userCover}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#4E4AFC]/10 flex items-center justify-center text-slate-400 text-xs">
              No cover photo
            </div>
          )}
        </div>

        {/* Profile Info Header */}
        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-14 mb-4">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white overflow-hidden shrink-0">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#4E4AFC] text-white font-medium text-3xl flex items-center justify-center">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <h1 className="text-2xl font-medium text-slate-900">
                {displayName}
              </h1>
              <p className="text-sm font-normal text-[#4E4AFC]">
                @{user.username}
              </p>
            </div>

            {user.bio && (
              <p className="text-sm text-slate-600 font-normal leading-relaxed max-w-2xl">
                {user.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 font-normal">
              {user.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.location}</span>
                </span>
              )}
              {user.website && (
                <a
                  href={
                    user.website.startsWith("http")
                      ? user.website
                      : `https://${user.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#4E4AFC] hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{user.website}</span>
                </a>
              )}
              {user.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Posts Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg text-slate-900">
          Posts ({userPosts.length})
        </h3>
        {userPosts.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 bg-white rounded-2xl border border-slate-200 font-normal">
            No posts published by this user yet.
          </div>
        ) : (
          userPosts.map((post) => (
            <PostCard key={post.id || post._id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}

