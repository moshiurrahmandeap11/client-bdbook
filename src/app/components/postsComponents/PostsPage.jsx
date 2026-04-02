"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    ChatBubbleLeftIcon,
    FaceSmileIcon,
    HeartIcon,
    PhotoIcon,
    ShareIcon,
    UserIcon,
    VideoCameraIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const PostsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingPost, setCreatingPost] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postDescription, setPostDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch posts
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/posts");
      if (response.data.success) {
        setPosts(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle like/unlike
  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      toast.error("Please login to like posts");
      return;
    }

    try {
      const response = await axiosInstance.post(`/posts/${postId}/like`);
      if (response.data.success) {
        // Update posts state
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId
              ? {
                  ...post,
                  likes: response.data.data.liked
                    ? [...post.likes, user._id]
                    : post.likes.filter(id => id !== user._id),
                  likesCount: response.data.data.liked
                    ? post.likesCount + 1
                    : post.likesCount - 1,
                }
              : post
          )
        );
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error("Like error:", error);
      toast.error("Failed to process like");
    }
  };

// Update the handleCreatePost function in PostsPage.jsx

const handleCreatePost = async () => {
  if (!postDescription.trim() && !selectedMedia) {
    toast.error("Please add a description or media");
    return;
  }

  setCreatingPost(true);
  try {
    const formData = new FormData();
    
    // Only append description if it has content
    if (postDescription.trim()) {
      formData.append("description", postDescription);
    }
    
    // Only append media if selected
    if (selectedMedia) {
      formData.append("media", selectedMedia);
    }
    
    console.log("Sending post data:", {
      description: postDescription,
      hasMedia: !!selectedMedia,
      mediaType: selectedMedia?.type
    });

    const response = await axiosInstance.post("/posts/create", formData, {
      headers: { 
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.success) {
      toast.success("Post created successfully!");
      setShowCreateModal(false);
      setPostDescription("");
      setSelectedMedia(null);
      setMediaPreview(null);
      setMediaType(null);
      fetchPosts(); // Refresh posts
    }
  } catch (error) {
    console.error("Create post error:", error);
    console.error("Error response:", error.response?.data);
    toast.error(error.response?.data?.message || "Failed to create post");
  } finally {
    setCreatingPost(false);
  }
};

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp", "video/mp4", "video/mov", "video/avi"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image or video file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size should be less than 50MB");
      return;
    }

    setSelectedMedia(file);
    setMediaType(file.type.startsWith("video") ? "video" : "image");
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Create Post Card */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
              {user?.profilePicture?.url ? (
                <Image
                  src={user.profilePicture.url}
                  alt={user.fullName}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5 text-white" />
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 text-left px-4 py-2 bg-white/10 rounded-xl text-white/70 hover:bg-white/20 transition-colors"
            >
              What's on your mind, {user?.fullName?.split(" ")[0]}?
            </button>
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                setShowCreateModal(true);
                fileInputRef.current?.click();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <PhotoIcon className="h-5 w-5 text-green-400" />
              <span className="text-sm">Photo</span>
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
                fileInputRef.current?.click();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <VideoCameraIcon className="h-5 w-5 text-red-400" />
              <span className="text-sm">Video</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <FaceSmileIcon className="h-5 w-5 text-yellow-400" />
              <span className="text-sm">Feeling</span>
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-12 text-center">
              <PhotoIcon className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No posts yet. Be the first to create a post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post._id}
                className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-4 hover:bg-white/10 transition-all duration-300"
              >
                {/* Post Header */}
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${post.userId}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer">
                      {post.userProfilePicture ? (
                        <Image
                          src={post.userProfilePicture}
                          alt={post.userName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </Link>
                  <div className="flex-1">
                    <Link href={`/profile/${post.userId}`}>
                      <h3 className="font-semibold text-white hover:text-purple-400 transition">
                        {post.userName}
                      </h3>
                    </Link>
                    <p className="text-white/40 text-xs">{getTimeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Post Content */}
                <Link href={`/posts/${post._id}`}>
                  <div className="mt-3 cursor-pointer">
                    {post.description && (
                      <p className="text-white/80 mb-3">{post.description}</p>
                    )}
                    {post.media && (
                      <div className="rounded-xl overflow-hidden bg-black/20">
                        {post.media.resourceType === "video" ? (
                          <video
                            src={post.media.url}
                            controls
                            className="w-full max-h-96 object-contain"
                          />
                        ) : (
                          <Image
                            src={post.media.url}
                            alt="Post media"
                            width={600}
                            height={400}
                            className="w-full object-cover max-h-96"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Post Stats */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleLike(post._id)}
                    className="flex items-center gap-1 text-white/60 hover:text-red-400 transition-colors"
                  >
                    {post.likes?.includes(user?._id) ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                    <span className="text-sm">{post.likesCount || 0}</span>
                  </button>
                  <Link href={`/post/details/${post._id}`}>
                    <button className="flex items-center gap-1 text-white/60 hover:text-purple-400 transition-colors">
                      <ChatBubbleLeftIcon className="h-5 w-5" />
                      <span className="text-sm">{post.commentsCount || 0}</span>
                    </button>
                  </Link>
                  <button className="flex items-center gap-1 text-white/60 hover:text-green-400 transition-colors">
                    <ShareIcon className="h-5 w-5" />
                    <span className="text-sm">{post.sharesCount || 0}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-2xl animate-fadeInDown">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Create Post</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setPostDescription("");
                  setSelectedMedia(null);
                  setMediaPreview(null);
                }}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                  {user?.profilePicture?.url ? (
                    <Image
                      src={user.profilePicture.url}
                      alt={user.fullName}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white">{user?.fullName}</p>
                </div>
              </div>

              <textarea
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows="4"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />

              {mediaPreview && (
                <div className="relative mt-4 rounded-xl overflow-hidden">
                  {mediaType === "video" ? (
                    <video src={mediaPreview} controls className="w-full max-h-64" />
                  ) : (
                    <Image src={mediaPreview} alt="Preview" width={500} height={300} className="w-full object-cover" />
                  )}
                  <button
                    onClick={() => {
                      setSelectedMedia(null);
                      setMediaPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition"
                  >
                    <XMarkIcon className="h-5 w-5 text-white" />
                  </button>
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition"
                >
                  Add Photo/Video
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleCreatePost}
                disabled={creatingPost}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
              >
                {creatingPost ? "Creating..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsPage;