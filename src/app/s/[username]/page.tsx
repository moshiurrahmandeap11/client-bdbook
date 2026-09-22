"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IUser, IPost } from "@/interfaces";
import {
  getUserByUsername,
  uploadProfilePicture,
  uploadCoverPhoto,
} from "@/services/user.service";
import { getUserPosts } from "@/services/post.service";
import {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowersCount,
  getFollowingCount,
} from "@/services/follow.service";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import PostCard from "@/components/post_components/PostCard";
import EditProfileModal from "@/components/profile_components/EditProfileModal";
import { Button } from "@/components/ui/Button";
import { getCachedData, setCachedData } from "@/lib/cache";
import {
  Calendar,
  MapPin,
  Globe,
  User as UserIcon,
  Cake,
  Edit3,
  Camera,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Loader2,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

const ProfileSkeleton = () => (
  <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 animate-pulse">
    {/* Card Skeleton */}
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">
      <div className="h-48 sm:h-64 bg-slate-200 w-full"></div>
      <div className="p-6 pt-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-16 mb-4">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-slate-300"></div>
          <div className="h-9 w-28 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="space-y-3">
          <div className="h-7 w-44 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-28 bg-slate-100 rounded-md"></div>
          <div className="h-12 w-full max-w-xl bg-slate-100 rounded-xl"></div>
          <div className="flex gap-4 pt-2">
            <div className="h-4 w-24 bg-slate-100 rounded"></div>
            <div className="h-4 w-24 bg-slate-100 rounded"></div>
            <div className="h-4 w-24 bg-slate-100 rounded"></div>
          </div>
          <div className="flex gap-6 pt-4 border-t border-slate-100">
            <div className="h-5 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    {/* Post Skeletons */}
    <div className="space-y-4">
      <div className="h-5 w-24 bg-slate-200 rounded"></div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200"></div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-3 w-20 bg-slate-100 rounded"></div>
          </div>
        </div>
        <div className="h-16 bg-slate-100 rounded-xl"></div>
      </div>
    </div>
  </div>
);

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const rawUsername = resolvedParams.username;
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, refreshUser } = useAuth();

  // Modals & quick uploads
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const quickAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const quickCoverInputRef = useRef<HTMLInputElement | null>(null);

  // 1. TanStack Query: User Profile (Instant Cache Hydration + 5 mins StaleTime)
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery<IUser | null>({
    queryKey: ["user-profile", username.toLowerCase()],
    queryFn: async () => {
      if (!username) return null;
      const userData = await getUserByUsername(username);
      if (
        userData?.username &&
        userData.username.toLowerCase() !== username.toLowerCase()
      ) {
        router.replace(`/s/${userData.username}`);
      }
      if (userData) {
        setCachedData(`user-profile-${username.toLowerCase()}`, userData);
      }
      return userData;
    },
    initialData: () => getCachedData<IUser>(`user-profile-${username.toLowerCase()}`),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const userId = user?.id || user?._id;

  const isOwner = Boolean(
    currentUser &&
      user &&
      (currentUser.id === user.id ||
        (currentUser as any)._id === user.id ||
        currentUser.username?.toLowerCase() === user.username?.toLowerCase())
  );

  // 2. TanStack Query: User Posts via dedicated fast endpoint (Instant Cache + 5 mins StaleTime)
  const { data: userPosts = [] } = useQuery<IPost[]>({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await getUserPosts(userId);
      const posts = res.data || [];
      setCachedData(`user-posts-${userId}`, posts);
      return posts;
    },
    initialData: () => (userId ? getCachedData<IPost[]>(`user-posts-${userId}`) : undefined),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // 3. TanStack Query: Stats (Instant Cache Hydration)
  const { data: followersCount = 0 } = useQuery<number>({
    queryKey: ["followers-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const count = await getFollowersCount(userId);
      setCachedData(`followers-count-${userId}`, count);
      return count;
    },
    initialData: () => (userId ? getCachedData<number>(`followers-count-${userId}`) : 0),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: followingCount = 0 } = useQuery<number>({
    queryKey: ["following-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const count = await getFollowingCount(userId);
      setCachedData(`following-count-${userId}`, count);
      return count;
    },
    initialData: () => (userId ? getCachedData<number>(`following-count-${userId}`) : 0),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // TanStack Query: Follow Status for visitor
  const { data: isFollowing = false } = useQuery<boolean>({
    queryKey: ["follow-status", userId],
    queryFn: () => (userId ? getFollowStatus(userId) : false),
    enabled: Boolean(currentUser && userId && !isOwner),
    staleTime: 60 * 1000,
  });

  // Optimistic Follow Action handler
  const handleFollowAction = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    if (!userId) return;

    const prevFollowing = isFollowing;
    const nextFollowing = !prevFollowing;

    // Instant Optimistic UI Update (0ms)
    queryClient.setQueryData(["follow-status", userId], nextFollowing);
    queryClient.setQueryData<number>(
      ["followers-count", userId],
      (prev = 0) => Math.max(0, nextFollowing ? prev + 1 : prev - 1)
    );
    toast.success(nextFollowing ? "Following!" : "Unfollowed");

    try {
      if (nextFollowing) {
        await followUser(userId);
      } else {
        await unfollowUser(userId);
      }
      queryClient.invalidateQueries({ queryKey: ["follow-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["followers-count", userId] });
    } catch (err: any) {
      queryClient.setQueryData(["follow-status", userId], prevFollowing);
      queryClient.setQueryData<number>(
        ["followers-count", userId],
        (prev = 0) => Math.max(0, prevFollowing ? prev + 1 : prev - 1)
      );
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to update follow status"
      );
    }
  };

  const handleQuickAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 1. Instant local preview (0ms)
    const localBlobUrl = URL.createObjectURL(file);
    const prevUserData = user;

    queryClient.setQueryData<IUser | null>(
      ["user-profile", username.toLowerCase()],
      (prev) => (prev ? { ...prev, profilePicUrl: localBlobUrl, avatar: localBlobUrl } : prev)
    );
    toast.success("Profile picture updated!");

    // 2. Background server upload
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("profilePic", file);
      const res = await uploadProfilePicture(formData);

      // 3. Persist permanent server URL in cache
      queryClient.setQueryData<IUser | null>(
        ["user-profile", username.toLowerCase()],
        (prev) => (prev ? { ...prev, profilePicUrl: res.url, avatar: res.url } : prev)
      );
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      await refreshUser();
    } catch (err: any) {
      // 4. Rollback on failure
      queryClient.setQueryData<IUser | null>(
        ["user-profile", username.toLowerCase()],
        prevUserData
      );
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload profile picture");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleQuickCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 1. Instant local preview (0ms)
    const localBlobUrl = URL.createObjectURL(file);
    const prevUserData = user;

    queryClient.setQueryData<IUser | null>(
      ["user-profile", username.toLowerCase()],
      (prev) => (prev ? { ...prev, coverPhotoUrl: localBlobUrl, coverImage: localBlobUrl } : prev)
    );
    toast.success("Cover photo updated!");

    // 2. Background server upload
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("coverPhoto", file);
      const res = await uploadCoverPhoto(formData);

      // 3. Persist permanent server URL in cache
      queryClient.setQueryData<IUser | null>(
        ["user-profile", username.toLowerCase()],
        (prev) => (prev ? { ...prev, coverPhotoUrl: res.url, coverImage: res.url } : prev)
      );
      await refreshUser();
    } catch (err: any) {
      // 4. Rollback on failure
      queryClient.setQueryData<IUser | null>(
        ["user-profile", username.toLowerCase()],
        prevUserData
      );
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload cover photo");
    } finally {
      setCoverUploading(false);
    }
  };

  // Only show skeleton on initial fetch if there is no cached user data
  if (isUserLoading && !user) {
    return <ProfileSkeleton />;
  }

  if (!user || isUserError) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <UserIcon className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-medium text-slate-800">User not found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-normal">
          The user <span className="font-medium text-slate-600">@{username}</span>{" "}
          could not be found or has been deactivated.
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
      {/* Banner & Header Card */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">
        {/* Cover Photo */}
        <div className="h-48 sm:h-64 bg-slate-200 relative overflow-hidden group">
          {userCover ? (
            <img
              src={userCover}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-[#4E4AFC]/20 to-purple-50 flex items-center justify-center text-slate-400 text-xs">
              No cover photo
            </div>
          )}

          {/* Quick Cover Change Button for Owner */}
          {isOwner && (
            <div className="absolute top-4 right-4 z-10">
              <input
                ref={quickCoverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQuickCoverUpload}
              />
              <button
                type="button"
                onClick={() => quickCoverInputRef.current?.click()}
                disabled={coverUploading}
                className="px-3 py-1.5 bg-slate-900/70 hover:bg-slate-900/90 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 backdrop-blur-md shadow transition-all cursor-pointer"
              >
                {coverUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <span>{userCover ? "Change Cover" : "Add Cover"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Info Header */}
        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-16 mb-4">
            {/* Avatar (clean flat white border, no shadow) */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white overflow-hidden shrink-0">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#4E4AFC] text-white font-semibold text-3xl flex items-center justify-center">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Quick Avatar Change Button for Owner */}
              {isOwner && (
                <>
                  <input
                    ref={quickAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQuickAvatarUpload}
                  />
                  <button
                    type="button"
                    onClick={() => quickAvatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute bottom-1 right-1 p-2 bg-[#4E4AFC] hover:bg-[#3D39E8] text-white rounded-full shadow-md border-2 border-white transition-all cursor-pointer"
                    title="Change profile picture"
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Actions: Owner vs Visitor */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {isOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-medium border-slate-300 hover:bg-slate-50"
                >
                  <Edit3 className="h-4 w-4 text-slate-500" />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Follow / Following button */}
                  <Button
                    type="button"
                    onClick={handleFollowAction}
                    className={cn(
                      "flex items-center gap-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer",
                      isFollowing
                        ? "bg-fb-btn text-foreground hover:bg-fb-btn-hover"
                        : "bg-primary hover:bg-primary-hover text-white"
                    )}
                  >
                    {isFollowing ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Follow +</span>
                      </>
                    )}
                  </Button>

                  {/* Direct Message Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/message?userId=${user.id}`)}
                    className="flex items-center gap-1.5 text-xs sm:text-sm border-border hover:bg-fb-btn text-foreground"
                  >
                    <MessageCircle className="h-4 w-4 text-muted" />
                    <span>Message</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {displayName}
                </h1>
                {user.isVerified && (
                  <span
                    className="inline-flex items-center justify-center p-0.5 rounded-full bg-[#4E4AFC] text-white"
                    title="Verified Profile"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[#4E4AFC]">
                @{user.username}
              </p>
            </div>

            {/* Bio */}
            {user.bio ? (
              <p className="text-sm text-slate-700 font-normal leading-relaxed max-w-2xl whitespace-pre-line">
                {user.bio}
              </p>
            ) : isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs text-[#4E4AFC] hover:underline flex items-center gap-1 py-1 cursor-pointer"
              >
                + Add a bio to tell people about yourself
              </button>
            ) : null}

            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 pt-1 font-normal">
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
                  className="flex items-center gap-1.5 text-[#4E4AFC] hover:underline font-medium"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{user.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
              {user.gender && (
                <span className="flex items-center gap-1.5 capitalize">
                  <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.gender}</span>
                </span>
              )}
              {user.dob && (
                <span className="flex items-center gap-1.5">
                  <Cake className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Born{" "}
                    {new Date(user.dob).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>
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

            {/* Stats Row: Followers, Following, Posts */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">
                  {followersCount}
                </span>
                <span className="text-slate-500 text-xs">
                  {followersCount === 1 ? "Follower" : "Followers"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">
                  {followingCount}
                </span>
                <span className="text-slate-500 text-xs">Following</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">
                  {userPosts.length}
                </span>
                <span className="text-slate-500 text-xs">
                  {userPosts.length === 1 ? "Post" : "Posts"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900">
            Posts ({userPosts.length})
          </h3>
        </div>
        {userPosts.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 bg-white font-normal">
            No posts published by this user yet.
          </div>
        ) : (
          <div className="bg-white divide-y divide-slate-100">
            {userPosts.map((post) => (
              <PostCard key={post.id || post._id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          onProfileUpdated={(updated) => {
            queryClient.setQueryData(
              ["user-profile", username.toLowerCase()],
              updated
            );
            queryClient.invalidateQueries({ queryKey: ["user-profile"] });
            queryClient.invalidateQueries({ queryKey: ["user-posts"] });
          }}
        />
      )}
    </div>
  );
}
