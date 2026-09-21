"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { IUser, IPost } from "@/interfaces";
import {
  getUserByUsername,
  uploadProfilePicture,
  uploadCoverPhoto,
} from "@/services/user.service";
import { getFeed } from "@/services/post.service";
import {
  getFriendsCount,
  getFollowersCount,
  getFollowingCount,
  getFriendStatus,
  sendFriendRequest,
  acceptFriendRequest,
  unfriend,
  getFriendRequests,
} from "@/services/friend.service";
import { useAuth } from "@/components/providers/AuthProvider";
import PostCard from "@/components/post_components/PostCard";
import EditProfileModal from "@/components/profile_components/EditProfileModal";
import { Button } from "@/components/ui/Button";
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

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const username = resolvedParams.username;
  const router = useRouter();
  const { user: currentUser, refreshUser } = useAuth();

  const [user, setUser] = useState<IUser | null>(null);
  const [userPosts, setUserPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Visitor friend status
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  // Modals & quick uploads
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const quickAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const quickCoverInputRef = useRef<HTMLInputElement | null>(null);

  const isOwner = Boolean(
    currentUser &&
      user &&
      (currentUser.id === user.id ||
        (currentUser as any)._id === user.id ||
        currentUser.username?.toLowerCase() === user.username?.toLowerCase())
  );

  const fetchProfileAndStats = async () => {
    if (!username) return;
    setLoading(true);

    try {
      const userData = await getUserByUsername(username);
      if (
        userData?.username &&
        userData.username.toLowerCase() !== username.toLowerCase()
      ) {
        router.replace(`/s/${userData.username}`);
      }
      setUser(userData);

      // Fetch posts
      const feedData = await getFeed();
      const posts = feedData.data || [];
      setUserPosts(
        posts.filter(
          (p: any) =>
            p.userId === userData.id ||
            p.user?.id === userData.id ||
            p.user?._id === userData.id ||
            (userData.username &&
              p.user?.username?.toLowerCase() ===
                userData.username.toLowerCase())
        )
      );

      // Fetch stats
      const [fCount, folCount, folingCount] = await Promise.all([
        getFriendsCount(userData.id),
        getFollowersCount(userData.id),
        getFollowingCount(userData.id),
      ]);

      setFriendsCount(fCount);
      setFollowersCount(folCount);
      setFollowingCount(folingCount);

      // Fetch visitor status if logged in and not owner
      if (
        currentUser &&
        currentUser.id !== userData.id &&
        (currentUser as any)._id !== userData.id
      ) {
        const status = await getFriendStatus(userData.id);
        setFriendStatus(status);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndStats();
  }, [username, router]);

  // When currentUser changes or loads, fetch friend status if needed
  useEffect(() => {
    if (
      user &&
      currentUser &&
      currentUser.id !== user.id &&
      (currentUser as any)._id !== user.id
    ) {
      getFriendStatus(user.id).then((status) => setFriendStatus(status));
    }
  }, [currentUser, user]);

  const handleFriendAction = async () => {
    if (!user || !currentUser) {
      router.push("/auth/login");
      return;
    }

    setFriendActionLoading(true);
    try {
      if (friendStatus === "not_friends" || friendStatus === "none") {
        await sendFriendRequest(user.id);
        setFriendStatus("request_sent");
        toast.success("Friend request sent!");
      } else if (friendStatus === "request_received") {
        const pending = await getFriendRequests();
        const request = pending.find(
          (r: any) => r.senderId === user.id || r.sender?.id === user.id
        );
        if (request?.id) {
          await acceptFriendRequest(request.id);
          setFriendStatus("friends");
          setFriendsCount((prev) => prev + 1);
          toast.success("Friend request accepted!");
        } else {
          toast.error("Could not find pending request.");
        }
      } else if (friendStatus === "friends") {
        await unfriend(user.id);
        setFriendStatus("not_friends");
        setFriendsCount((prev) => Math.max(0, prev - 1));
        toast.success("Friend removed");
      }
    } catch (err: any) {
      console.error("Friend action error:", err);
      toast.error(err?.message || "Action failed");
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleQuickAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("profilePic", file);
      const res = await uploadProfilePicture(formData);
      setUser((prev) => (prev ? { ...prev, profilePicUrl: res.url } : prev));
      await refreshUser();
      toast.success("Profile picture updated!");
    } catch (err: any) {
      console.error("Failed to upload profile picture:", err);
      toast.error(err?.message || "Failed to upload profile picture");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleQuickCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("coverPhoto", file);
      const res = await uploadCoverPhoto(formData);
      setUser((prev) => (prev ? { ...prev, coverPhotoUrl: res.url } : prev));
      await refreshUser();
      toast.success("Cover photo updated!");
    } catch (err: any) {
      console.error("Failed to upload cover photo:", err);
      toast.error(err?.message || "Failed to upload cover photo");
    } finally {
      setCoverUploading(false);
    }
  };

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
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm">
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
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden shrink-0">
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
                  {/* Friend / Follow button */}
                  {friendStatus === "friends" ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={friendActionLoading}
                      onClick={handleFriendAction}
                      className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors group"
                    >
                      {friendActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 group-hover:hidden" />
                          <UserX className="h-4 w-4 hidden group-hover:inline" />
                          <span className="group-hover:hidden">Friends</span>
                          <span className="hidden group-hover:inline">Unfriend</span>
                        </>
                      )}
                    </Button>
                  ) : friendStatus === "request_sent" ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={friendActionLoading}
                      className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 border-slate-200 bg-slate-50"
                    >
                      {friendActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 text-slate-400" />
                          <span>Request Sent</span>
                        </>
                      )}
                    </Button>
                  ) : friendStatus === "request_received" ? (
                    <Button
                      type="button"
                      disabled={friendActionLoading}
                      onClick={handleFriendAction}
                      className="flex items-center gap-1.5 text-xs sm:text-sm"
                    >
                      {friendActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span>Accept Request</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={friendActionLoading}
                      onClick={handleFriendAction}
                      className="flex items-center gap-1.5 text-xs sm:text-sm"
                    >
                      {friendActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span>Add Friend</span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Direct Message Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/message?userId=${user.id}`)}
                    className="flex items-center gap-1.5 text-xs sm:text-sm border-slate-300 hover:bg-slate-50"
                  >
                    <MessageCircle className="h-4 w-4 text-slate-500" />
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

            {/* Stats Row: Followers, Following, Friends, Posts */}
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
                  {friendsCount}
                </span>
                <span className="text-slate-500 text-xs">
                  {friendsCount === 1 ? "Friend" : "Friends"}
                </span>
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
          <div className="text-center py-12 text-sm text-slate-400 bg-white rounded-2xl border border-slate-200 font-normal">
            No posts published by this user yet.
          </div>
        ) : (
          userPosts.map((post) => (
            <PostCard key={post.id || post._id} post={post} />
          ))
        )}
      </div>

      {/* Edit Profile Modal */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          onProfileUpdated={(updated) => {
            setUser(updated);
          }}
        />
      )}
    </div>
  );
}
