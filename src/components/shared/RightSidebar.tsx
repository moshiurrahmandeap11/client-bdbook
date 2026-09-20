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

  const { data: postsData } = useQuery({
    queryKey: ["recent-posts-sidebar"],
    queryFn: async () => {
      const res = await postService.getPosts({ page: 1, limit: 5 });
      return res.data || [];
    },
    enabled: !isAuthPage,
    staleTime: 5 * 60 * 1000,
  });

  // Don't show right sidebar on auth pages
  if (isAuthPage) {
    return null;
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
