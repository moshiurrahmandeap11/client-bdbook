"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  CheckCircleIcon,
  FaceSmileIcon,
  PhotoIcon,
  UserIcon,
  VideoCameraIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

const PostsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [creatingPost, setCreatingPost] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(true); // Modal খোলা থাকবে
  const [postDescription, setPostDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const fileInputRef = useRef(null);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push("/auth/login");
    return null;
  }

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
        // Reset form
        setPostDescription("");
        setSelectedMedia(null);
        setMediaPreview(null);
        setMediaType(null);
        
        // Optional: Redirect to profile or home after successful post
        setTimeout(() => {
          router.push(`/profile/${user?._id || user?.id}`);
        }, 1500);
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

  const handleCloseModal = () => {
    router.back(); // Go back to previous page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Create Post Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-2xl animate-fadeInDown max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-black/90">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BD</span>
                </div>
                <h2 className="text-xl font-bold text-white">Create New Post</h2>
              </div>
              <button
                onClick={handleCloseModal}
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
                  <p className="text-white/40 text-xs">Public post</p>
                </div>
              </div>

              <textarea
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows="4"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                autoFocus
              />

              {mediaPreview && (
                <div className="relative mt-4 rounded-xl overflow-hidden bg-black/30">
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
                    className="absolute top-2 right-2 p-1 bg-black/70 rounded-full hover:bg-black/90 transition"
                  >
                    <XMarkIcon className="h-5 w-5 text-white" />
                  </button>
                </div>
              )}

              <div className="mt-4">
                <p className="text-white/60 text-sm mb-2">Add to your post</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition flex items-center justify-center gap-2 group"
                  >
                    <PhotoIcon className="h-5 w-5 text-green-400 group-hover:scale-110 transition" />
                    <span className="text-sm">Photo</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition flex items-center justify-center gap-2 group"
                  >
                    <VideoCameraIcon className="h-5 w-5 text-red-400 group-hover:scale-110 transition" />
                    <span className="text-sm">Video</span>
                  </button>
                  <button
                    className="flex-1 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition flex items-center justify-center gap-2 group"
                  >
                    <FaceSmileIcon className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition" />
                    <span className="text-sm">Feeling</span>
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
            </div>

            <div className="sticky bottom-0 p-4 border-t border-white/10 bg-black/90">
              <button
                onClick={handleCreatePost}
                disabled={creatingPost}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingPost ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostsPage;