"use client";

import { useSocket } from "@/components/providers/SocketProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { postService } from "@/services/post.service";
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  FaceSmileIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  PlusIcon,
  UserCircleIcon,
  UserIcon,
  UserGroupIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import NotificationDropdown from "../notification_components/NotificationDropdown";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Logo } from "@/components/ui/Logo";

export const Header = () => {
  const { user, logout, isAuthenticated, initialLoadDone } = useAuth();
  const { socket } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);

  // Global Create Post Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postDescription, setPostDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const mobileProfileRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleHomeClick = () => {
    if (pathname === "/") {
      queryClient.refetchQueries({ queryKey: ["posts"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  };

  const navItems = useMemo(
    () => [
      { name: "Home", href: "/", icon: HomeIcon },
      { name: "Videos", href: "/videos", icon: VideoCameraIcon },
      { name: "Messages", href: "/message", icon: MessageCircle },
      { name: "Room", href: "/room", icon: VideoCameraSlashIcon },
    ],
    []
  );

  const { data: suggestionsData, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const response = await axiosInstance.get(
        `/users/search/${encodeURIComponent(searchQuery)}`,
        {
          params: { limit: 5 },
        }
      );
      if (!response.data.success) return [];
      return [
        ...new Set(
          (response.data.data as any[]).map((u: any) => u.fullName).filter(Boolean)
        ),
      ].slice(0, 5);
    },
    enabled: isAuthenticated && searchQuery.trim().length >= 2,
    staleTime: 3 * 60 * 1000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: async () => {
      const response = await axiosInstance.get("/users/unread-messages/count");
      return response.data.success ? response.data.count : 0;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 10 * 1000,
  });

  const unreadMessagesCount = unreadData || 0;

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

  const handleCreatePostSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to create a post");
      router.push("/auth/login");
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

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      toast.error("Please login to create a post");
      router.push("/auth/login");
      return;
    }
    setShowCreateModal(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        if (showMobileSearch) {
          setShowMobileSearch(true);
        } else {
          setShowSearchDropdown(true);
        }
      }, 300);
    } else {
      setShowSearchDropdown(false);
      if (showMobileSearch) setShowMobileSearch(true);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      setShowMobileSearch(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
// [wip step 1/4]
