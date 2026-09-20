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

// [wip step 2/4]
