"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { postService } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import {
  FaceSmileIcon,
  PhotoIcon,
  UserIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import PostCard from "./PostCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";

const PostSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-slate-200"></div>
      <div className="flex-1">
        <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-slate-100 rounded w-24"></div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-slate-200 rounded w-full"></div>
      <div className="h-4 bg-slate-100 rounded w-3/4"></div>
    </div>
    <div className="mt-4 aspect-video bg-slate-100 rounded-xl"></div>
    <div className="flex justify-between mt-4 pt-3 border-t border-slate-100">
      <div className="h-8 bg-slate-100 rounded w-24"></div>
      <div className="h-8 bg-slate-100 rounded w-24"></div>
      <div className="h-8 bg-slate-100 rounded w-24"></div>
    </div>
  </div>
);

const FeedSkeleton = () => (
  <div className="space-y-4 max-w-2xl mx-auto">
    {[...Array(3)].map((_, i) => (
      <PostSkeleton key={i} />
    ))}
  </div>
);

export const PostFeed = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postDescription, setPostDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "200px",
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      return postService.getPosts({ page: pageParam, limit: 8 });
    },
    getNextPageParam: (lastPage: any) => {
      const page = lastPage.pagination?.page || lastPage.meta?.page || 1;
      const pages = lastPage.pagination?.pages || lastPage.meta?.totalPage || 1;
      if (page < pages) return page + 1;
      return undefined;
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 8 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return postService.createPost(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setShowCreateModal(false);
      setPostDescription("");
      setSelectedMedia(null);
      setMediaPreview(null);
      toast.success("Post created!");
    },
    onError: (error: any) => {
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

  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mov",
      "video/avi",
    ];
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
    reader.onloadend = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const refreshPosts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  }, [queryClient]);

  const handleProfileClick = () => {
    const userId = user?._id || user?.id;
    if (userId) {
      window.location.href = `/profile/${userId}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        {/* Create Post Card */}
        {isAuthenticated && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={handleProfileClick}
                className="flex-shrink-0 focus:outline-none cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center overflow-hidden">
                  {(typeof user?.profilePicture === "object"
                    ? user?.profilePicture?.url
                    : user?.profilePicture || user?.avatar) ? (
                    <Image
                      src={
                        (typeof user?.profilePicture === "object"
                          ? user?.profilePicture?.url
                          : user?.profilePicture || user?.avatar) as string
                      }
                      alt={user?.fullName || user?.name || "User"}
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
                className="flex-1 text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full text-slate-500 hover:text-slate-800 transition-colors text-sm cursor-pointer"
              >
                What&apos;s on your mind, {user?.fullName?.split(" ")[0]}?
              </button>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50/60 rounded-xl transition cursor-pointer"
              >
                <VideoCameraIcon className="h-5 w-5 text-red-500" />
                <span className="text-xs sm:text-sm font-medium">Video</span>
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/60 rounded-xl transition cursor-pointer"
              >
                <PhotoIcon className="h-5 w-5 text-emerald-500" />
                <span className="text-xs sm:text-sm font-medium">Photo</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50/60 rounded-xl transition cursor-pointer"
              >
                <FaceSmileIcon className="h-5 w-5 text-amber-500" />
                <span className="text-xs sm:text-sm font-medium">Feeling</span>
              </button>
            </div>
          </div>
        )}

        {/* Posts Feed */}
        {isLoading ? (
          <FeedSkeleton />
        ) : allPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PhotoIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Posts Yet</h3>
            <p className="text-slate-500 text-sm mb-5">Be the first to share something with your community!</p>
            {isAuthenticated ? (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Post
              </Button>
            ) : (
              <Link href="/auth/login">
                <Button variant="primary">Login to See Posts</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {allPosts.map((post: IPost) => (
              <PostCard
                key={post._id || post.id}
                post={post}
                onPostUpdate={refreshPosts}
                currentUser={user}
              />
            ))}

            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            )}

            {hasNextPage && !isFetchingNextPage && (
              <div ref={loadMoreRef} className="h-4" />
            )}

            {!hasNextPage && allPosts.length > 0 && (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">You&apos;ve seen all posts! 🎉</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal using reusable Modal & TextArea & Button */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPostDescription("");
          setSelectedMedia(null);
          setMediaPreview(null);
        }}
        title="Create Post"
        maxWidth="md"
        footer={
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleCreatePost}
            loading={createPostMutation.isPending}
            disabled={!postDescription.trim() && !selectedMedia}
          >
            Post
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {(typeof user?.profilePicture === "object"
                ? user?.profilePicture?.url
                : user?.profilePicture || user?.avatar) ? (
                <Image
                  src={
                    (typeof user?.profilePicture === "object"
                      ? user?.profilePicture?.url
                      : user?.profilePicture || user?.avatar) as string
                  }
                  alt={user?.fullName || user?.name || "User"}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">{user?.fullName || "You"}</p>
              <span className="text-xs text-slate-500">Public</span>
            </div>
          </div>

          <TextArea
            value={postDescription}
            onChange={(e) => setPostDescription(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            autoFocus
          />

          {mediaPreview && (
            <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              {mediaType === "video" ? (
                <video src={mediaPreview} controls className="w-full max-h-64" />
              ) : (
                <Image
                  src={mediaPreview}
                  alt="Preview"
                  width={500}
                  height={300}
                  className="w-full object-cover max-h-64"
                />
              )}
              <button
                onClick={() => {
                  setSelectedMedia(null);
                  setMediaPreview(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 rounded-full text-white transition-colors cursor-pointer"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="border border-slate-200/90 rounded-xl p-3 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-600 mb-2">Add to your post</p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
              >
                <PhotoIcon className="h-4 w-4 text-emerald-500" />
                <span>Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
              >
                <VideoCameraIcon className="h-4 w-4 text-red-500" />
                <span>Video</span>
              </button>
              <button
                onClick={() => {}}
                className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
              >
                <FaceSmileIcon className="h-4 w-4 text-amber-500" />
                <span>Feeling</span>
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
      </Modal>
    </div>
  );
};

export default PostFeed;
