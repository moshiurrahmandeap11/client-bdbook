"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  CalendarIcon,
  CameraIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  HeartIcon,
  LinkIcon,
  MapPinIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  ShareIcon,
  UserIcon,
  VideoCameraIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [likingPosts, setLikingPosts] = useState({});

  const isOwnProfile = currentUser?._id === id || currentUser?.id === id;

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Fetch user profile
        const userResponse = await axiosInstance.get(`/users/id/${id}`);
        if (userResponse.data.success) {
          setProfileUser(userResponse.data.data);
          
          // Try to fetch user posts
          try {
            const postsResponse = await axiosInstance.get(`/posts/user/${id}`);
            if (postsResponse.data.success) {
              setPosts(postsResponse.data.data);
              setStats(prev => ({ ...prev, posts: postsResponse.data.data.length }));
            }
          } catch (postsError) {
            console.log("Posts endpoint not available yet:", postsError.message);
            setPosts([]);
            setStats(prev => ({ ...prev, posts: 0 }));
          }
          
          // Fetch followers/following stats
          try {
            const statsResponse = await axiosInstance.get(`/users/stats/${id}`);
            if (statsResponse.data.success) {
              setStats(prev => ({
                ...prev,
                followers: statsResponse.data.data.followers,
                following: statsResponse.data.data.following,
              }));
            }
          } catch (statsError) {
            console.log("Stats endpoint not available yet:", statsError.message);
            setStats(prev => ({
              ...prev,
              followers: 0,
              following: 0,
            }));
          }
          
          // Check if current user is following this profile
          if (isAuthenticated && currentUser) {
            try {
              const followResponse = await axiosInstance.get(`/users/following/check/${id}`);
              setIsFollowing(followResponse.data.data.isFollowing);
            } catch (followError) {
              console.log("Follow check endpoint not available yet:", followError.message);
              setIsFollowing(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [id, isAuthenticated, currentUser]);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    
    setIsLoadingFollow(true);
    try {
      const response = await axiosInstance.post(`/users/follow/${id}`);
      if (response.data.success) {
        setIsFollowing(!isFollowing);
        setStats(prev => ({
          ...prev,
          followers: isFollowing ? prev.followers - 1 : prev.followers + 1,
        }));
        toast.success(isFollowing ? "Unfollowed successfully" : "Followed successfully");
      }
    } catch (error) {
      console.error("Follow action failed:", error);
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setIsLoadingFollow(false);
    }
  };

  // Handle like/unlike
  const handleLike = async (postId, currentLikeCount, isCurrentlyLiked) => {
    if (!isAuthenticated) {
      toast.error("Please login to like posts");
      router.push("/auth/login");
      return;
    }

    if (likingPosts[postId]) return;
    
    setLikingPosts(prev => ({ ...prev, [postId]: true }));
    
    // Optimistic update
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likesCount: isCurrentlyLiked ? currentLikeCount - 1 : currentLikeCount + 1,
            isLikedByCurrentUser: !isCurrentlyLiked
          };
        }
        return post;
      })
    );
    
    try {
      const response = await axiosInstance.post(`/posts/${postId}/like`);
      if (response.data.success) {
        // Refresh the specific post to ensure consistency
        const freshResponse = await axiosInstance.get(`/posts/${postId}`);
        if (freshResponse.data.success) {
          setPosts(prevPosts =>
            prevPosts.map(post => 
              post._id === postId ? freshResponse.data.data : post
            )
          );
        }
      }
    } catch (error) {
      console.error("Like error:", error);
      // Revert on error
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              likesCount: currentLikeCount,
              isLikedByCurrentUser: isCurrentlyLiked
            };
          }
          return post;
        })
      );
      toast.error("Failed to process like");
    } finally {
      setLikingPosts(prev => ({ ...prev, [postId]: false }));
    }
  };

  const formatDate = (date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeAgo = (date) => {
    if (!date) return "recently";
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

  // Navigate to post details
  const goToPostDetails = (postId) => {
    router.push(`/post/details/${postId}`);
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

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <UserIcon className="h-20 w-20 text-white/30 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
          <p className="text-white/60 mb-6">The profile you're looking for doesn't exist</p>
          <Link
            href="/"
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cover Photo Section */}
        <div className="relative mb-20">
          <div className="h-48 sm:h-64 rounded-2xl overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20">
            {profileUser.coverPhoto?.url ? (
              <Image
                src={profileUser.coverPhoto.url}
                alt="Cover"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                <CameraIcon className="h-12 w-12 text-white/50" />
              </div>
            )}
          </div>
          
          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-6">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/20 backdrop-blur-xl bg-white/10 overflow-hidden">
                {profileUser.profilePicture?.url ? (
                  <Image
                    src={profileUser.profilePicture.url}
                    alt={profileUser.fullName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Link
                  href={`/profile/edit/${id}`}
                  className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                >
                  <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {profileUser.fullName}
                </h1>
                {profileUser.isVerified && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                    Verified
                  </span>
                )}
                {isOwnProfile && (
                  <Link
                    href={`/profile/edit/${id}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-white/80 text-sm hover:bg-white/20 transition-colors"
                  >
                    <PencilIcon className="h-3 w-3" />
                    <span>Edit Profile</span>
                  </Link>
                )}
              </div>
              <p className="text-white/60 text-sm mt-1">@{profileUser.email?.split("@")[0]}</p>
              
              {profileUser.bio && (
                <p className="text-white/80 mt-3">{profileUser.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-4 mt-4">
                {profileUser.location && (
                  <div className="flex items-center gap-1 text-white/60 text-sm">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{profileUser.location}</span>
                  </div>
                )}
                {profileUser.website && (
                  <div className="flex items-center gap-1 text-white/60 text-sm">
                    <LinkIcon className="h-4 w-4" />
                    <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400">
                      {profileUser.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1 text-white/60 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Joined {formatDate(profileUser.createdAt)}</span>
                </div>
              </div>
            </div>
            
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={isLoadingFollow}
                className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  isFollowing
                    ? "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105"
                } disabled:opacity-50`}
              >
                {isLoadingFollow ? "Processing..." : isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex gap-6 mt-6 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.posts}</p>
              <p className="text-white/60 text-sm">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.followers}</p>
              <p className="text-white/60 text-sm">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{stats.following}</p>
              <p className="text-white/60 text-sm">Following</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/10">
            {[
              { id: "posts", label: "Posts", icon: DocumentTextIcon },
              { id: "videos", label: "Videos", icon: VideoCameraIcon },
              { id: "photos", label: "Photos", icon: PhotoIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? "text-purple-400 border-b-2 border-purple-400 bg-white/5"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <Icon className="h-5 w-5 sm:hidden" />
                </button>
              );
            })}
          </div>

          {/* Content based on active tab */}
          <div className="p-4 sm:p-6">
            {activeTab === "posts" && (
              <>
                {posts.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No posts yet</p>
                    {isOwnProfile && (
                      <Link
                        href="/posts"
                        className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform"
                      >
                        Create Your First Post
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {posts.map((post) => {
                      const isLiked = post.likes?.includes(currentUser?._id) || post.isLikedByCurrentUser;
                      const likeCount = post.likesCount || 0;
                      const commentCount = post.commentsCount || 0;
                      const shareCount = post.sharesCount || 0;
                      
                      return (
                        <div
                          key={post._id}
                          className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {profileUser.profilePicture?.url ? (
                                <Image
                                  src={profileUser.profilePicture.url}
                                  alt={profileUser.fullName}
                                  width={40}
                                  height={40}
                                  className="object-cover"
                                />
                              ) : (
                                <UserIcon className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-white text-sm sm:text-base">
                                  {profileUser.fullName}
                                </span>
                                <span className="text-white/40 text-xs">{getTimeAgo(post.createdAt)}</span>
                              </div>
                              
                              {/* Post Content - Click to go to details */}
                              <div 
                                onClick={() => goToPostDetails(post._id)}
                                className="cursor-pointer"
                              >
                                <p className="text-white/80 mb-3 text-sm sm:text-base break-words">
                                  {post.description || post.content}
                                </p>
                                {post.media && (
                                  <div className="rounded-lg overflow-hidden mb-3">
                                    {post.media.resourceType === "video" ? (
                                      <video
                                        src={post.media.url}
                                        controls
                                        className="w-full max-h-96 object-contain"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <Image
                                        src={post.media.url}
                                        alt="Post media"
                                        width={500}
                                        height={300}
                                        className="w-full object-cover max-h-96"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-4 mt-2 pt-2 border-t border-white/10">
                                <button
                                  onClick={() => handleLike(post._id, likeCount, isLiked)}
                                  disabled={likingPosts[post._id]}
                                  className="flex items-center gap-1 text-white/60 hover:text-red-400 transition-colors disabled:opacity-50"
                                >
                                  {isLiked ? (
                                    <HeartSolidIcon className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <HeartIcon className="h-5 w-5" />
                                  )}
                                  <span className="text-sm">{likeCount}</span>
                                </button>
                                
                                <button
                                  onClick={() => goToPostDetails(post._id)}
                                  className="flex items-center gap-1 text-white/60 hover:text-purple-400 transition-colors"
                                >
                                  <ChatBubbleLeftIcon className="h-5 w-5" />
                                  <span className="text-sm">{commentCount}</span>
                                </button>
                                
                                <button
                                  onClick={() => goToPostDetails(post._id)}
                                  className="flex items-center gap-1 text-white/60 hover:text-green-400 transition-colors"
                                >
                                  <ShareIcon className="h-5 w-5" />
                                  <span className="text-sm">{shareCount}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === "videos" && (
              <div className="text-center py-12">
                <VideoCameraIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/60">No videos yet</p>
                {isOwnProfile && (
                  <Link
                    href="/posts"
                    className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform"
                  >
                    Create a Video Post
                  </Link>
                )}
              </div>
            )}

            {activeTab === "photos" && (
              <div className="text-center py-12">
                <PhotoIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/60">No photos yet</p>
                {isOwnProfile && (
                  <Link
                    href="/posts"
                    className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:scale-105 transition-transform"
                  >
                    Share a Photo
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Create Post Button - FAB (only for own profile) */}
      {isOwnProfile && (
        <Link
          href="/create-post"
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-40 p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group"
        >
          <PlusIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          <span className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-black/80 text-white text-sm px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Create Post
          </span>
        </Link>
      )}
    </div>
  );
};

export default ProfilePage;