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
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setShowSearchDropdown(false);
    setShowMobileSearch(false);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    setSearchQuery("");
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowSearchDropdown(false);
    setShowMobileSearch(true);
    mobileSearchInputRef.current?.focus();
  };

  const openMobileSearch = () => {
    setShowMobileSearch(true);
    setSearchQuery("");
    setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
  };

  const closeMobileSearch = () => {
    setShowMobileSearch(false);
    setSearchQuery("");
    setShowSearchDropdown(false);
  };

  const toggleMobileProfileMenu = () => {
    setShowMobileProfileMenu((prev) => !prev);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (
        mobileProfileRef.current &&
        !mobileProfileRef.current.contains(target)
      ) {
        setShowMobileProfileMenu(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        !(target as HTMLElement).closest(".mobile-menu-button")
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewMessage = (message: any) => {
      const currentUserId = user?._id || user?.id;
      if (message.senderId !== currentUserId) {
        toast.custom(
          (t) => (
            <div
              className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3.5 cursor-pointer max-w-sm"
              onClick={() => {
                toast.dismiss(t.id);
                router.push("/message");
              }}
            >
              <div className="flex items-center gap-3">
                {message.senderProfilePicture ? (
                  <img
                    src={message.senderProfilePicture}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#4E4AFC] flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-slate-900 text-sm font-normal">
                    {message.senderName || "Someone"}
                  </p>
                  <p className="text-slate-500 text-xs truncate">
                    {message.message || "Sent you a message"}
                  </p>
                </div>
              </div>
            </div>
          ),
          { duration: 4000 }
        );
      }
    };

    socket.on("receive_message", handleNewMessage);
    return () => {
      socket.off("receive_message", handleNewMessage);
    };
  }, [socket, isAuthenticated, user, router]);

  useEffect(() => {
    let ticking = false;
    const handleWindowScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
    setShowSearchDropdown(false);
    setShowMobileSearch(false);
    setShowMobileProfileMenu(false);
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsProfileMenuOpen(false);
    setShowMobileProfileMenu(false);
    router.push("/auth/login");
  }, [logout, router]);

  const handleGetStarted = useCallback(() => {
    router.push("/auth/login");
  }, [router]);

  const handleProfileClick = useCallback(() => {
    setIsProfileMenuOpen((prev) => !prev);
  }, []);

  const handleProfileNavigate = useCallback(() => {
    setIsProfileMenuOpen(false);
    setShowMobileProfileMenu(false);
    const userId = user?._id || user?.id;
    if (userId) {
      router.push(`/profile/${userId}`);
    }
  }, [router, user]);

  const BrandLogo = (
    <Logo size="md" onClick={handleHomeClick} priority />
  );

  if (!initialLoadDone) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="w-full px-4 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center shrink-0">{BrandLogo}</div>
          </div>
        </div>
      </header>
    );
  }

  const suggestions = suggestionsData || [];
  const isSearching = isSuggestionsLoading;
  const userPic =
    (typeof user?.profilePicture === "object"
      ? user?.profilePicture?.url
      : user?.profilePicture) ||
    user?.avatar ||
    null;
  const userName = user?.fullName || user?.name || "User";

  return (
    <>
      {/* DESKTOP HEADER (SLOTHUI / REDDIT STYLE) */}
      <header
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "backdrop-blur-xl bg-white/95 border-b border-slate-200/90 shadow-xs"
            : "bg-white border-b border-slate-200/80"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-6">
            {/* Left: Brand Logo & Name */}
            <div className="flex items-center shrink-0">
              {BrandLogo}
            </div>

            {/* Center: Centered Rounded Pill Search Bar */}
            <div className="flex-1 max-w-xl relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() =>
                      searchQuery.trim().length >= 2 && setShowSearchDropdown(true)
                    }
                    placeholder="Search stalk"
                    className="w-full bg-slate-100 hover:bg-slate-200/70 text-slate-900 rounded-full py-2 pl-4 pr-10 placeholder:text-slate-400 border border-slate-200/80 focus:bg-white focus:border-slate-300 focus:ring-0 transition-all text-sm outline-none"
                  />
                  <MagnifyingGlassIcon className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  
                  {searchQuery && (
                    <button
// [wip step 2/4]
