"use client";

import { useSocket } from "@/components/providers/SocketProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import { postService } from "@/services/post.service";
import { searchService } from "@/services/search.service";
import { IUser } from "@/interfaces";
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
  FaceSmileIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
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
import {
  NotificationTrigger,
  NotificationDrawer,
} from "../notification_components/NotificationDrawer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Logo } from "@/components/ui/Logo";
import { CustomVideoPlayer } from "@/components/ui/CustomVideoPlayer";

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

  const { data: suggestionsData, isLoading: isSuggestionsLoading } = useQuery<IUser[]>({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      return await searchService.searchUsers(searchQuery, 6);
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
              className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3.5 cursor-pointer max-w-sm shadow-md"
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
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-foreground text-sm font-semibold">
                    {message.senderName || "Someone"}
                  </p>
                  <p className="text-muted text-xs truncate">
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
    const userIdentifier = user?.username || user?._id || user?.id;
    if (userIdentifier) {
      router.push(`/s/${userIdentifier}`);
    }
  }, [router, user]);

  const BrandLogo = (
    <Logo size="md" onClick={handleHomeClick} priority />
  );

  if (!initialLoadDone) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
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
      {/* DESKTOP HEADER (FACEBOOK STYLE) */}
      <header
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "backdrop-blur-xl bg-card/95 border-b border-border shadow-xs"
            : "bg-card border-b border-border"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-6">
            {/* Left: Brand Logo */}
            <div className="flex items-center shrink-0">
              {BrandLogo}
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-xl relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="stalk_search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() =>
                      searchQuery.trim().length >= 2 && setShowSearchDropdown(true)
                    }
                    placeholder="Search stalk"
                    className="w-full fb-input-pill py-2 pl-4 pr-10 border border-transparent focus:bg-card focus:border-border-inner focus:ring-0 transition-all text-sm outline-none"
                  />
                  <MagnifyingGlassIcon className="absolute right-3.5 h-4 w-4 text-muted pointer-events-none" />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-9 p-0.5 hover:bg-fb-btn-hover rounded-full transition cursor-pointer"
                    >
                      <XMarkIcon className="h-3.5 w-3.5 text-muted" />
                    </button>
                  )}
                </div>

                {(showSearchDropdown || isSearching) &&
                  searchQuery.trim().length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-border shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto animate-fadeInDown">
                      {isSearching ? (
                        <div className="p-4 text-center text-muted text-sm font-normal">
                          Searching...
                        </div>
                      ) : suggestions.length > 0 ? (
                        <>
                          <div className="px-4 py-2 border-b border-border bg-canvas">
                            <span className="text-muted text-xs font-normal tracking-wider">
                              Users
                            </span>
                          </div>
                          {suggestions.map((sUser: IUser) => {
                            const uAvatar =
                              sUser.avatar ||
                              sUser.profilePicUrl ||
                              (typeof sUser.profilePicture === "object"
                                ? sUser.profilePicture?.url
                                : sUser.profilePicture);
                            const uName = sUser.fullName || sUser.name || sUser.username || "User";
                            const uUsername = sUser.username || sUser.id || sUser._id;
                            return (
                              <button
                                key={sUser.id || sUser._id}
                                type="button"
                                onClick={() => {
                                  setShowSearchDropdown(false);
                                  setShowMobileSearch(false);
                                  setSearchQuery("");
                                  router.push(`/s/${uUsername}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-fb-input transition text-left cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center overflow-hidden shrink-0 border border-border-inner">
                                  {uAvatar ? (
                                    <img
                                      src={uAvatar}
                                      alt={uName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs font-medium text-primary">
                                      {uName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {uName}
                                  </p>
                                  {sUser.username && (
                                    <p className="text-xs text-muted truncate font-normal">
                                      @{sUser.username}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <div className="px-4 py-6 text-center text-muted text-sm font-normal">
                          No results found
                        </div>
                      )}
                    </div>
                  )}
              </form>
            </div>

            {/* Right: + Create Button + Action Icons + Profile Avatar */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* + Create Button */}
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer shadow-xs"
              >
                <PlusIcon className="h-4 w-4 stroke-[2.5]" />
                <span>Create</span>
              </button>

              {/* Direct Messages Icon */}
              <Link
                href="/message"
                className="w-10 h-10 rounded-full fb-btn-circle transition relative"
                aria-label="Messages"
              >
                <MessageCircle className="h-5 w-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-normal text-white px-1 animate-pulse">
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                  </span>
                )}
              </Link>

              {/* Notifications Trigger */}
              <NotificationTrigger />

              {/* User Profile / Get Started */}
              {!isAuthenticated ? (
                <button
                  onClick={handleGetStarted}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-foreground bg-fb-btn hover:bg-fb-btn-hover transition-colors cursor-pointer"
                >
                  <span>Log in</span>
                </button>
              ) : (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
                    aria-label="Profile"
                  >
                    {userPic ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border">
                        <Image
                          src={userPic}
                          alt={userName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-semibold text-xs border border-primary/20">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-lg overflow-hidden animate-fadeInDown z-50">
                      <div className="py-2">
                        <div className="px-4 py-3 border-b border-border bg-canvas">
                          <p className="text-foreground font-semibold text-sm">
                            {userName}
                          </p>
                          <p className="text-muted text-xs mt-0.5 truncate">
                            {user?.email || ""}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleProfileNavigate();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-fb-input transition-colors text-left text-sm cursor-pointer"
                        >
                          <UserCircleIcon className="h-4 w-4 text-muted" />
                          <span>Profile</span>
                        </button>
                        <Link
                          href="/community"
                          className="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-fb-input transition-colors text-sm"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <UserGroupIcon className="h-4 w-4 text-muted" />
                          <span>Community</span>
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-fb-input transition-colors text-sm"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Cog6ToothIcon className="h-4 w-4 text-muted" />
                          <span>Settings</span>
                        </Link>
                        <Link
                          href="/help"
                          className="flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-fb-input transition-colors text-sm"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <QuestionMarkCircleIcon className="h-4 w-4 text-muted" />
                          <span>Help & Support</span>
                        </Link>
                        <div className="border-t border-border my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors text-left text-sm cursor-pointer"
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
                          <span>Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          {BrandLogo}

          <div className="flex items-center gap-2">
            <button
              onClick={openMobileSearch}
              className="p-2 rounded-full hover:bg-fb-input text-muted hover:text-foreground transition cursor-pointer"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Mobile + Create button */}
            <button
              onClick={handleOpenCreateModal}
              className="p-2 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer"
              aria-label="Create Post"
            >
              <PlusIcon className="h-4 w-4 stroke-[2.5]" />
            </button>

            <Link
              href="/message"
              className="p-2 rounded-full hover:bg-fb-input text-muted hover:text-foreground transition relative"
              aria-label="Messages"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-normal text-white px-1 animate-pulse">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              )}
            </Link>

            {isAuthenticated && <NotificationTrigger />}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-fb-input text-muted hover:text-foreground transition mobile-menu-button cursor-pointer"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55] bg-black/40 backdrop-blur-xs flex justify-end"
          ref={mobileMenuRef}
        >
          <div className="w-64 bg-card h-full p-4 flex flex-col justify-between border-l border-border animate-slideDown">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span className="text-foreground font-semibold text-lg">Menu</span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-full text-muted hover:text-foreground cursor-pointer"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const isMessage = item.name === "Messages";
                  const hasUnread = isMessage && unreadMessagesCount > 0;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${
                        isActive
                          ? "fb-nav-item-active"
                          : "fb-nav-item"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      {hasUnread && (
                        <span className="bg-red-500 text-white text-xs font-normal px-2 py-0.5 rounded-full">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {isAuthenticated && (
                <div className="mt-6 pt-4 border-t border-border space-y-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleProfileNavigate();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm fb-nav-item text-left cursor-pointer"
                  >
                    <UserCircleIcon className="h-5 w-5 text-muted" />
                    <span>Profile</span>
                  </button>
                  <Link
                    href="/community"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm fb-nav-item"
                  >
                    <UserGroupIcon className="h-5 w-5 text-muted" />
                    <span>Community</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm fb-nav-item"
                  >
                    <Cog6ToothIcon className="h-5 w-5 text-muted" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm fb-nav-item"
                  >
                    <QuestionMarkCircleIcon className="h-5 w-5 text-muted" />
                    <span>Help & Support</span>
                  </Link>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="pt-4 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-normal text-red-600 hover:bg-red-50 text-left cursor-pointer"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE SEARCH OVERLAY */}
      {showMobileSearch && (
        <div className="md:hidden fixed inset-0 z-[60] bg-card flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={closeMobileSearch}
              className="p-2 -ml-2 rounded-full hover:bg-fb-input transition cursor-pointer"
            >
              <ArrowLeftIcon className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={mobileSearchInputRef}
                type="text"
                name="stalk_search_mobile"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search stalk..."
                className="w-full fb-input-pill py-2.5 pl-4 pr-10 border border-transparent focus:bg-card focus:border-border-inner text-sm outline-none"
                autoFocus
              />
              <MagnifyingGlassIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-9 top-1/2 -translate-y-1/2 p-1 hover:bg-fb-btn-hover rounded-full cursor-pointer"
                >
                  <XMarkIcon className="h-4 w-4 text-muted" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="p-6 text-center text-muted text-sm font-normal">
                Searching...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="divide-y divide-border">
                <div className="px-4 py-2 bg-canvas border-b border-border">
                  <span className="text-muted text-xs font-normal tracking-wider">
                    Users
                  </span>
                </div>
                {suggestions.map((sUser: IUser) => {
                  const uAvatar =
                    sUser.avatar ||
                    sUser.profilePicUrl ||
                    (typeof sUser.profilePicture === "object"
                      ? sUser.profilePicture?.url
                      : sUser.profilePicture);
                  const uName = sUser.fullName || sUser.name || sUser.username || "User";
                  const uUsername = sUser.username || sUser.id || sUser._id;
                  return (
                    <button
                      key={sUser.id || sUser._id}
                      type="button"
                      onClick={() => {
                        setShowMobileSearch(false);
                        setSearchQuery("");
                        router.push(`/s/${uUsername}`);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fb-input transition text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center overflow-hidden shrink-0 border border-border-inner">
                        {uAvatar ? (
                          <img
                            src={uAvatar}
                            alt={uName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {uName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {uName}
                        </p>
                        {sUser.username && (
                          <p className="text-xs text-muted truncate font-normal">
                            @{sUser.username}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="p-8 text-center text-muted text-sm font-normal">
                No results found
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* GLOBAL CREATE POST MODAL (TRIGGERABLE FROM ANYWHERE) */}
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
            onClick={handleCreatePostSubmit}
            loading={createPostMutation.isPending}
            disabled={!postDescription.trim() && !selectedMedia}
          >
            Post
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
              {userPic ? (
                <Image
                  src={userPic}
                  alt={userName}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{userName}</p>
              <span className="text-xs text-muted">Public</span>
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
                <CustomVideoPlayer
                  src={mediaPreview}
                  maxHeight={260}
                  compact
                  className="w-full"
                />
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
              <button
                type="button"
                className="flex-1 py-2 bg-card hover:bg-fb-input border border-border-inner rounded-lg text-foreground transition flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
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
      <NotificationDrawer />
    </>
  );
};

export default Header;
