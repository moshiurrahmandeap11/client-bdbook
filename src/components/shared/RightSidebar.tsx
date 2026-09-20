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
// [wip step 1/4]
