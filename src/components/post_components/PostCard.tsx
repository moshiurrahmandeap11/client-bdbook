"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { postService } from "@/services/post.service";
import { IPost } from "@/types/post.types";
import { IUser } from "@/types/user.types";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  EyeSlashIcon,
  LinkIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import Avatar from "./Avatar";
import CustomVideoPlayer from "./CustomVideoPlayer";
import SharedPostPreview from "./SharedPostPreview";
import ShareModal from "./ShareModal";
import { Dropdown, DropdownItemProps } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { cn } from "@/lib/utils";

const getTimeAgo = (date?: string | Date) => {
  if (!date) return "recently";
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  for (const [unit, s] of Object.entries(intervals)) {
    const n = Math.floor(seconds / s);
    if (n >= 1) return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
};

interface PostCardProps {
  post: IPost | any;
  onPostUpdate?: () => void;
  hideMenu?: boolean;
  currentUser?: IUser | null;
}

export const PostCard = memo(({ post, onPostUpdate, hideMenu = false }: PostCardProps) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentUserId = user?._id || user?.id;

  const initialLikeState = useMemo(() => {
    const likesArr = post.likes || [];
    const isLiked = likesArr.includes(currentUserId) || post.isLikedByCurrentUser;
    return {
      isLiked: !!isLiked,
      likeCount: post.likesCount || likesArr.length || 0,
    };
  }, [post.likes, post.isLikedByCurrentUser, post.likesCount, currentUserId]);

  const [isLiked, setIsLiked] = useState(initialLikeState.isLiked);
  const [likeCount, setLikeCount] = useState(initialLikeState.likeCount);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState(post.description || "");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const postUserId = post.userId || post.user?._id || post.user?.id;
  const isOwner = postUserId === currentUserId;
  const commentCount = post.commentsCount || post.comments?.length || 0;

  const isSharedPost = useMemo(
    () => !!(post.isShare || post.originalPost || post.sharedPost || post.sharedPostId || post.type === "share"),
    [post.isShare, post.originalPost, post.sharedPost, post.sharedPostId, post.type]
  );

  const originalPost = useMemo(() => post.originalPost || post.sharedPost || null, [post.originalPost, post.sharedPost]);

  const sharePreview = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const targetPost = originalPost || post;
// [wip step 1/5]
