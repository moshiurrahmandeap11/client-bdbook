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
  <div className="p-5 fb-card animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-fb-btn"></div>
      <div className="flex-1">
        <div className="h-3.5 bg-fb-btn rounded w-32 mb-1.5"></div>
        <div className="h-2.5 bg-fb-input rounded w-20"></div>
      </div>
    </div>
    <div className="mt-3 space-y-2">
      <div className="h-4 bg-fb-btn rounded w-4/5"></div>
      <div className="h-3.5 bg-fb-input rounded w-full"></div>
    </div>
    <div className="mt-4 aspect-video bg-fb-input rounded-xl"></div>
    <div className="flex gap-2 mt-4 pt-3 border-t border-border">
      <div className="h-8 bg-fb-input rounded-md flex-1"></div>
      <div className="h-8 bg-fb-input rounded-md flex-1"></div>
      <div className="h-8 bg-fb-input rounded-md flex-1"></div>
    </div>
  </div>
);

const FeedSkeleton = () => (
  <div className="space-y-4">
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
      const pages = lastPage.pagination?.pages || lastPage.meta?.totalPages || lastPage.meta?.totalPage || 1;
      if (page < pages) return page + 1;
      return undefined;
    },
    staleTime: 60 * 1000,
    gcTime: 8 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
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

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size should be less than 100MB");
      return;
    }

    if (file.type.startsWith("video")) {
      const videoElement = document.createElement("video");
      videoElement.preload = "metadata";
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 120) {
          const mins = Math.floor(videoElement.duration / 60);
          const secs = Math.round(videoElement.duration % 60);
          toast.error(`Video duration cannot exceed 2 minutes (${mins}m ${secs}s selected)`);
          setSelectedMedia(null);
          setMediaPreview(null);
          setMediaType(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      };
      videoElement.src = URL.createObjectURL(file);
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

  const userPic = (typeof user?.profilePicture === "object" ? user?.profilePicture?.url : user?.profilePicture || user?.avatar) || null;
  const userName = user?.fullName || user?.name || "User";

  return (
    <div className="max-w-2xl mx-auto py-5 px-2 sm:px-4 space-y-4">
      {/* Create Post Header Bar - Facebook style */}
      {isAuthenticated && (
        <div className="p-3 fb-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-canvas shrink-0">
            {userPic ? (
              <Image src={userPic} alt={userName} width={40} height={40} className="object-cover w-full h-full" unoptimized />
            ) : (
              <div className="w-full h-full bg-primary-light text-primary flex items-center justify-center">
                <UserIcon className="h-5 w-5" />
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 text-left px-4 py-2.5 fb-input-pill text-[15px] cursor-pointer"
          >
            What&apos;s on your mind?
          </button>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setTimeout(() => fileInputRef.current?.click(), 100);
            }}
            className="p-2 text-emerald-500 hover:bg-fb-input rounded-full transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            title="Photo/video"
          >
            <PhotoIcon className="h-6 w-6 text-emerald-500" />
            <span className="hidden sm:inline text-xs font-semibold text-muted">Photo</span>
          </button>
        </div>
      )}

      {/* Posts Feed List - Facebook style gap between posts */}
      {isLoading && allPosts.length === 0 ? (
        <FeedSkeleton />
      ) : allPosts.length === 0 ? (
        <div className="py-16 px-6 text-center fb-card">
          <div className="w-16 h-16 bg-primary-light text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PhotoIcon className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No Posts Yet</h3>
          <p className="text-muted text-xs mb-5">Be the first to share something with the community!</p>
          {isAuthenticated ? (
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              Create First Post
            </Button>
          ) : (
            <Link href="/auth/login">
              <Button variant="primary" size="sm">Login to See Posts</Button>
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
              <div className="w-6 h-6 border-2 border-border-inner border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {hasNextPage && !isFetchingNextPage && (
            <div ref={loadMoreRef} className="h-4" />
          )}

          {!hasNextPage && allPosts.length > 0 && (
            <div className="text-center py-10">
              <CheckCircleIcon className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-muted text-xs font-normal">You&apos;ve reached the end! 🎉</p>
            </div>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPostDescription("");
          setSelectedMedia(null);
          setMediaPreview(null);
        }}
        title="Create Post"
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
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden shrink-0">
              {userPic ? (
                <Image src={userPic} alt={userName} width={40} height={40} className="object-cover" />
              ) : (
                <UserIcon className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{userName}</p>
              <span className="text-xs text-muted">Posting to stalk feed</span>
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
            <div className="relative rounded-xl overflow-hidden bg-canvas border border-border-inner">
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
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full text-white transition cursor-pointer"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="border border-border-inner rounded-xl p-3 bg-canvas/50">
            <p className="text-xs font-semibold text-muted mb-2">Add to your post</p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-card hover:bg-fb-input border border-border-inner rounded-lg text-foreground transition flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
              >
                <PhotoIcon className="h-4 w-4 text-emerald-500" />
                <span>Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-card hover:bg-fb-input border border-border-inner rounded-lg text-foreground transition flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
              >
                <VideoCameraIcon className="h-4 w-4 text-rose-500" />
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
        </div>
      </Modal>
    </div>
  );
};

export default PostFeed;
