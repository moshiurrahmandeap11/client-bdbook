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
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import PostCard from "../sharedComponents/PostCard/PostCard";

// Skeleton Components (same as before)
const PostSkeleton = () => (
  <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-4 animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-white/20"></div>
      <div className="flex-1">
        <div className="h-4 bg-white/20 rounded w-32 mb-2"></div>
        <div className="h-3 bg-white/20 rounded w-24"></div>
      </div>
    </div>
    <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-white/20 rounded w-1/2 mb-4"></div>
    <div className="aspect-video bg-white/20 rounded-xl mb-4"></div>
    <div className="flex justify-between pt-3 border-t border-white/10">
      <div className="h-8 bg-white/20 rounded w-20"></div>
      <div className="h-8 bg-white/20 rounded w-20"></div>
      <div className="h-8 bg-white/20 rounded w-20"></div>
    </div>
  </div>
);

const FeedSkeleton = () => (
  <div className="space-y-4 max-w-3xl mx-auto">
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
  const loadMoreRef = useRef(null);

  // Fetch posts with infinite query - better caching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosInstance.get(`/posts?page=${pageParam}&limit=10`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      if (page < pages) {
        return page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - longer cache
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 2,
    retryDelay: 1000,
  });

  // Prefetch single post data
  const prefetchPost = (postId) => {
    queryClient.prefetchQuery({
      queryKey: ["post", postId],
      queryFn: async () => {
        const response = await axiosInstance.get(`/posts/${postId}`);
        return response.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  // Create post mutation with better cache update
  const createPostMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await axiosInstance.post("/posts/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (newPost) => {
      // Update cache optimistically
      queryClient.setQueryData(["posts"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              data: [newPost.data, ...(old.pages[0]?.data || [])],
            },
            ...old.pages.slice(1),
          ],
        };
      });
      
      setShowCreateModal(false);
      setPostDescription("");
      setSelectedMedia(null);
      setMediaPreview(null);
      toast.success("Post created successfully!");
      
      // Refetch to ensure consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create post");
    },
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const allPosts = data?.pages.flatMap((page) => page.data) || [];

  // Prefetch next posts when nearing the end
  useEffect(() => {
    if (allPosts.length > 0 && hasNextPage && !isFetchingNextPage) {
      const lastPost = allPosts[allPosts.length - 1];
      if (lastPost) {
        prefetchPost(lastPost._id);
      }
    }
  }, [allPosts, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Create Post Card */}
        {isAuthenticated && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-4 mb-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                {user?.profilePicture?.url ? (
                  <Image src={user.profilePicture.url} alt={user.fullName} width={40} height={40} className="object-cover" />
                ) : (
                  <UserIcon className="h-5 w-5 text-white" />
                )}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 text-left px-4 py-2.5 bg-white/10 rounded-full text-white/70 hover:bg-white/20 transition-colors text-sm"
              >
                What's on your mind, {user?.fullName?.split(" ")[0]}?
              </button>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition group"
              >
                <VideoCameraIcon className="h-5 w-5 text-red-400 group-hover:scale-110 transition" />
                <span className="text-sm font-medium">Live video</span>
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition group"
              >
                <PhotoIcon className="h-5 w-5 text-green-400 group-hover:scale-110 transition" />
                <span className="text-sm font-medium">Photo/video</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition group"
              >
                <FaceSmileIcon className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition" />
                <span className="text-sm font-medium">Feeling</span>
              </button>
            </div>
          </div>
        )}

        {/* Posts Feed */}
        {isLoading ? (
          <FeedSkeleton />
        ) : allPosts.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhotoIcon className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Posts Yet</h3>
            <p className="text-white/60 mb-6">Be the first to share something with the community!</p>
            {isAuthenticated ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
              >
                Create Your First Post
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
          <>
            {allPosts.map((post, index) => (
              <div
                key={post._id}
                ref={index === allPosts.length - 1 ? loadMoreRef : null}
              >
                <PostCard
                  post={post}
                  onPostUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ["posts"] });
                  }}
                  currentUser={user}
                />
              </div>
            ))}
            
            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            )}
            
            {/* End of feed */}
            {!hasNextPage && allPosts.length > 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircleIcon className="h-6 w-6 text-white/40" />
                </div>
                <p className="text-white/40 text-sm">You've seen all posts! 🎉</p>
              </div>
            )}
          </>
        )}
      </div>

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
                    <Image src={user.profilePicture.url} alt={user.fullName} width={40} height={40} className="object-cover" />
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
                    className="absolute top-2 right-2 p-1 bg-black/70 rounded-full hover:bg-black/90 transition"
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
                    className="flex-1 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
                  >
                    <PhotoIcon className="h-5 w-5 text-green-400" />
                    <span className="text-sm">Photo</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
                  >
                    <VideoCameraIcon className="h-5 w-5 text-red-400" />
                    <span className="text-sm">Video</span>
                  </button>
                  <button className="flex-1 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition flex items-center justify-center gap-2">
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

            <div className="sticky bottom-0 p-4 border-t border-white/10 bg-black/90">
              <button
                onClick={handleCreatePost}
                disabled={createPostMutation.isPending}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
              >
                {createPostMutation.isPending ? (
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

export default Posts;