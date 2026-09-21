"use client";

import { useQuery } from "@tanstack/react-query";
import { postService } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import Avatar from "../post_components/Avatar";

export const RightSidebar: React.FC = () => {
  const pathname = usePathname();
  const [cleared, setCleared] = useState(false);
  const isAuthPage = pathname.startsWith("/auth");

  const { data: postsData, isLoading } = useQuery({
    queryKey: ["recent-posts-sidebar"],
    queryFn: async () => {
      const res = await postService.getPosts({ page: 1, limit: 5 });
      return res.data || [];
    },
    enabled: !isAuthPage,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 60 * 60 * 1000,    // 1 hour memory persistence
  });

  // Don't show right sidebar on auth pages
  if (isAuthPage) {
    return null;
  }

  // Loading skeleton on first render before cache is available
  if (isLoading && !postsData && !cleared) {
    return (
      <aside className="hidden xl:block w-80 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-6 px-6 border-l border-slate-200/80 bg-white animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="py-3.5 flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-200"></div>
                  <div className="h-3 w-16 bg-slate-200 rounded"></div>
                </div>
                <div className="h-3.5 bg-slate-100 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
              </div>
              <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0"></div>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const recentPosts: IPost[] = postsData || [];

  if (cleared || recentPosts.length === 0) {
    return (
      <aside className="hidden xl:block w-80 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-6 px-6 border-l border-slate-200/80 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-normal text-sm text-slate-900">Recent Posts</h3>
        </div>
        <p className="text-xs text-slate-400">No recent posts</p>
      </aside>
    );
  }

  return (
    <aside className="hidden xl:block w-80 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-6 px-6 border-l border-slate-200/80 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-normal text-sm text-slate-900 tracking-tight">Recent Posts</h3>
        <button
          onClick={() => setCleared(true)}
          className="text-xs font-normal text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          Clear
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {recentPosts.map((post) => {
          const authorName = post.userName || post.user?.fullName || "User";
          const authorPic =
            post.userProfilePicture ||
            (typeof post.user?.profilePicture === "object"
              ? post.user?.profilePicture?.url
              : post.user?.profilePicture);
          const mediaUrl = post.mediaUrl || post.media?.url;
          const mediaType = post.mediaType || post.media?.resourceType;

          return (
            <Link
              key={post._id || post.id}
              href={`/post/details/${post._id || post.id}`}
              className="group block py-3.5 first:pt-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Avatar src={authorPic} name={authorName} size={18} />
                    <span className="text-xs font-normal text-slate-700 truncate">
                      s/{authorName.toLowerCase().replace(/\s+/g, "")}
                    </span>
                  </div>
                  <p className="text-xs font-normal text-slate-900 group-hover:text-[#4E4AFC] line-clamp-2 leading-snug transition-colors">
                    {post.description || "Shared a post"}
                  </p>
                </div>

                {mediaUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                    {mediaType === "video" ? (
                      <video src={mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <Image
                        src={mediaUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default RightSidebar;
