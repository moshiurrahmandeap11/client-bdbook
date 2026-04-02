"use client";


import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  FaceSmileIcon,
  PhotoIcon,
  PlusIcon,
  UserIcon,
  VideoCameraIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import PostCard from "../sharedComponents/PostCard/PostCard";

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

  // Handle create post
  const handleCreatePost = async () => {
    if (!postDescription.trim() && !selectedMedia) {
      toast.error("Please add a description or media");
      return;
    }

    setCreatingPost(true);
    try {
      const formData = new FormData();
      
      if (postDescription.trim()) {
        formData.append("description", postDescription);
      }
      
      if (selectedMedia) {
        formData.append("media", selectedMedia);
      }

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
        fetchPosts();
      }
    } catch (error) {
      console.error("Create post error:", error);
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
        {/* Welcome Header */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            Welcome back, {user?.fullName?.split(" ")[0] || "User"}! 👋
          </h1>
          <p className="text-white/60 mt-2">See what's happening in your community</p>
        </div>

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
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <PhotoIcon className="h-5 w-5 text-green-400" />
              <span className="text-sm">Photo</span>
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setTimeout(() => fileInputRef.current?.click(), 100);
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

        {/* Posts Feed - Using PostCard Component */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-12 text-center">
              <PhotoIcon className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No posts yet. Be the first to create a post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard 
                key={post._id} 
                post={post} 
                onPostUpdate={fetchPosts}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Create Post Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-40 p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group"
      >
        <PlusIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        <span className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-black/80 text-white text-sm px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Create Post
        </span>
      </button>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-2xl animate-fadeInDown max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-black/90">
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

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
                >
                  <PhotoIcon className="h-5 w-5 text-green-400" />
                  <span>Photo</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
                >
                  <VideoCameraIcon className="h-5 w-5 text-red-400" />
                  <span>Video</span>
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

            <div className="sticky bottom-0 p-4 border-t border-white/10 bg-black/90">
              <button
                onClick={handleCreatePost}
                disabled={creatingPost}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
              >
                {creatingPost ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Creating...
                  </div>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsPage;