"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  FaceSmileIcon,
  PhotoIcon,
  UserIcon,
  VideoCameraIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import PostCard from "../sharedComponents/PostCard/PostCard";

// Optimized Skeleton with shimmer effect
const PostSkeleton = () => (
  <div className="bg-white/5 rounded-2xl border border-white/10 p-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/10"></div>
      <div className="flex-1">
        <div className="h-4 bg-white/10 rounded w-32 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-24"></div>
      </div>
    </div>
    <div className="mt-3 space-y-2">
      <div className="h-4 bg-white/10 rounded w-full"></div>
      <div className="h-4 bg-white/10 rounded w-3/4"></div>
    </div>
    <div className="mt-4 aspect-video bg-white/10 rounded-xl"></div>
    <div className="flex justify-between mt-4 pt-3 border-t border-white/10">
      <div className="h-8 bg-white/10 rounded w-20"></div>
      <div className="h-8 bg-white/10 rounded w-20"></div>
      <div className="h-8 bg-white/10 rounded w-20"></div>
    </div>
  </div>
);

const FeedSkeleton = () => (
  <div className="space-y-3 max-w-4xl mx-auto px-4">
    {[...Array(3)].map((_, i) => (
      <PostSkeleton key={i} />
    ))}
  </div>
);

// Main Posts Component
const Posts = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postDescription, setPostDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const fileInputRef = useRef(null);
  
  // Intersection Observer for infinite scroll (more performant)
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "200px",
  });

  // Optimized fetch with smaller limit for mobile
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosInstance.get(`/posts?page=${pageParam}&limit=8`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      if (page < pages) return page + 1;
      return undefined;
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 8 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1000,
  });

  // Auto fetch next page when inView
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Memoized posts
  const allPosts = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await axiosInstance.post("/posts/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setShowCreateModal(false);
      setPostDescription("");
      setSelectedMedia(null);
      setMediaPreview(null);
      toast.success("Post created!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create post");
    },
  });

  const handleCreatePost = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to create a post");
      return;
    }
    
    if (!postDescription.trim() && !selectedMedia) {
      toast.error("Please add a description or media");
      return;
    }

    const formData = new FormData();
    if (postDescription.trim()) formData.append("description", postDescription);
    if (selectedMedia) formData.append("media", selectedMedia);
    
    createPostMutation.mutate(formData);
  };

  const handleMediaSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp", "video/mp4"];
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
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const refreshPosts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  }, [queryClient]);

  // Profile click handler
  const handleProfileClick = () => {
    if (user?._id) {
      window.location.href = `/profile/${user._id}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-16 pb-24">
      {/* Wider container - max-w-7xl for larger posts */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        
        {/* Create Post Card - Mobile Optimized */}
        {isAuthenticated && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-3 mb-4 shadow-lg">
            <div className="flex items-center gap-3">
              {/* Profile picture with click navigation */}
              <button 
                onClick={handleProfileClick}
                className="flex-shrink-0 focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                  {user?.profilePicture?.url ? (
                    <Image 
                      src={user.profilePicture.url} 
                      alt={user.fullName} 
                      width={40} 
                      height={40} 
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5 text-white" />
                  )}
                </div>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 text-left px-4 py-2.5 bg-white/10 rounded-full text-white/70 hover:bg-white/20 active:bg-white/30 transition-colors text-sm"
              >
                What's on your mind?
              </button>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white active:bg-white/5 rounded-xl transition"
              >
                <VideoCameraIcon className="h-5 w-5 text-red-400" />
                <span className="text-xs sm:text-sm">Live</span>
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white active:bg-white/5 rounded-xl transition"
              >
                <PhotoIcon className="h-5 w-5 text-green-400" />
                <span className="text-xs sm:text-sm">Photo</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white active:bg-white/5 rounded-xl transition"
              >
                <FaceSmileIcon className="h-5 w-5 text-yellow-400" />
                <span className="text-xs sm:text-sm">Feeling</span>
              </button>
            </div>
          </div>
        )}

        {/* Posts Feed - Full width */}
        {isLoading ? (
          <FeedSkeleton />
        ) : allPosts.length === 0 ? (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhotoIcon className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Posts Yet</h3>
            <p className="text-white/60 mb-6">Be the first to share something!</p>
            {isAuthenticated ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
              >
                Create First Post
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
              >
                Login to See Posts
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {allPosts.map((post, index) => (
              <PostCard
                key={post._id}
                post={post}
                onPostUpdate={refreshPosts}
                currentUser={user}
              />
            ))}
            
            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* Load more trigger */}
            {hasNextPage && !isFetchingNextPage && (
              <div ref={loadMoreRef} className="h-4" />
            )}
            
            {/* End of feed */}
            {!hasNextPage && allPosts.length > 0 && (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-10 w-10 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">You've seen all posts! 🎉</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal - Mobile Optimized */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-black/95 rounded-t-2xl sm:rounded-2xl border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-black/95">
              <h2 className="text-lg font-bold text-white">Create Post</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setPostDescription("");
                  setSelectedMedia(null);
                  setMediaPreview(null);
                }}
                className="p-2 rounded-full bg-white/10 active:bg-white/20 transition"
              >
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={handleProfileClick}
                  className="focus:outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                    {user?.profilePicture?.url ? (
                      <Image src={user.profilePicture.url} alt={user.fullName} width={40} height={40} className="object-cover" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-white" />
                    )}
                  </div>
                </button>
                <div>
                  <p className="font-semibold text-white">{user?.fullName}</p>
                </div>
              </div>

              <textarea
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                autoFocus
              />

              {mediaPreview && (
                <div className="relative mt-4 rounded-xl overflow-hidden bg-black/30">
                  {mediaType === "video" ? (
                    <video src={mediaPreview} controls className="w-full max-h-64" />
                  ) : (
                    <Image src={mediaPreview} alt="Preview" width={500} height={300} className="w-full object-cover max-h-64" />
                  )}
                  <button
                    onClick={() => {
                      setSelectedMedia(null);
                      setMediaPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/70 rounded-full active:bg-black/90 transition"
                  >
                    <XMarkIcon className="h-5 w-5 text-white" />
                  </button>
                </div>
              )}

              <div className="mt-4 border border-white/20 rounded-xl p-3">
                <p className="text-white/60 text-sm mb-2">Add to your post</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-white/10 rounded-lg text-white active:bg-white/20 transition flex items-center justify-center gap-2"
                  >
                    <PhotoIcon className="h-5 w-5 text-green-400" />
                    <span className="text-sm">Photo</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-white/10 rounded-lg text-white active:bg-white/20 transition flex items-center justify-center gap-2"
                  >
                    <VideoCameraIcon className="h-5 w-5 text-red-400" />
                    <span className="text-sm">Video</span>
                  </button>
                  <button className="flex-1 py-2 bg-white/10 rounded-lg text-white active:bg-white/20 transition flex items-center justify-center gap-2">
                    <FaceSmileIcon className="h-5 w-5 text-yellow-400" />
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

            <div className="sticky bottom-0 p-4 border-t border-white/10 bg-black/95">
              <button
                onClick={handleCreatePost}
                disabled={createPostMutation.isPending}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold active:scale-95 transition-all duration-200 disabled:opacity-50"
              >
                {createPostMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Posts;