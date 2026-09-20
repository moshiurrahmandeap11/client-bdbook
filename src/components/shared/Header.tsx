"use client";

import { useSocket } from "@/components/providers/SocketProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  HomeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserGroupIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import NotificationDropdown from "../notification_components/NotificationDropdown";

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
              className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3.5 shadow-2xl cursor-pointer max-w-sm"
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-slate-900 text-sm font-semibold">
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

  const Logo = (
    <button onClick={handleHomeClick} className="group cursor-pointer">
      <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-sm shadow-indigo-200">
        <span className="text-white font-bold text-xl">BD</span>
      </div>
    </button>
  );

  if (!initialLoadDone) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center shrink-0">{Logo}</div>
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
      {/* DESKTOP HEADER */}
      <header
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "backdrop-blur-xl bg-white/95 border-b border-slate-200/90 shadow-xs"
            : "bg-white/85 backdrop-blur-md border-b border-slate-200/80"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-4 flex-1">
              {Logo}

              <div className="flex-1 max-w-md relative" ref={searchRef}>
                <form onSubmit={handleSearchSubmit} className="w-full relative">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() =>
                        searchQuery.trim().length >= 2 && setShowSearchDropdown(true)
                      }
                      placeholder="Search BD BOOK..."
                      className="w-full bg-slate-100/90 hover:bg-slate-100 text-slate-900 rounded-full py-2 pl-10 pr-10 placeholder:text-slate-400 border border-slate-200/80 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all text-sm outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition cursor-pointer"
                      >
                        <XMarkIcon className="h-4 w-4 text-slate-500" />
                      </button>
                    )}
                  </div>

                  {(showSearchDropdown || isSearching) &&
                    searchQuery.trim().length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto animate-fadeInDown">
                        {isSearching ? (
                          <div className="p-4 text-center text-slate-400 text-sm">
                            Searching...
                          </div>
                        ) : suggestions.length > 0 ? (
                          <>
                            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                Quick Search
                              </span>
                            </div>
                            {suggestions.map((suggestion: string, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left cursor-pointer"
                              >
                                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <span className="text-slate-800 text-sm font-medium">
                                  {suggestion}
                                </span>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="px-4 py-6 text-center text-slate-400 text-sm">
                            No results found
                          </div>
                        )}
                      </div>
                    )}
                </form>
              </div>
            </div>

            {/* Right: Navigation + Profile */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center justify-center space-x-1 lg:space-x-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const isMessage = item.name === "Messages";
                  const hasUnread = isMessage && unreadMessagesCount > 0;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "text-indigo-600 bg-indigo-50 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 relative">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            isActive ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-800"
                          }`}
                        />
                        <span>{item.name}</span>
                        {hasUnread && (
                          <span className="absolute -top-1.5 -right-3 min-w-[18px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 animate-pulse">
                            {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <NotificationDropdown />

              {!isAuthenticated ? (
                <button
                  onClick={handleGetStarted}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 active:scale-95 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                </button>
              ) : (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    {userPic ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                        <Image
                          src={userPic}
                          alt={userName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <UserCircleIcon className="h-5 w-5" />
                      </div>
                    )}
                    <span className="text-slate-800 font-semibold text-sm">
                      {userName.split(" ")[0]}
                    </span>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-fadeInDown z-50">
                      <div className="py-2">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                          <p className="text-slate-900 font-bold text-sm">
                            {userName}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5 truncate">
                            {user?.email || ""}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleProfileNavigate();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left text-sm cursor-pointer"
                        >
                          <UserCircleIcon className="h-4 w-4 text-slate-400" />
                          <span>Profile</span>
                        </button>
                        <Link
                          href="/community"
                          className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-sm"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <UserGroupIcon className="h-4 w-4 text-slate-400" />
                          <span>Friends</span>
                        </Link>
                        <div className="border-t border-slate-100 my-1"></div>
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
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200/80">
        <div className="px-4 h-16 flex items-center justify-between">
          {Logo}

          <div className="flex-1"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={openMobileSearch}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Direct Messages Icon on Mobile Header */}
            <Link
              href="/message"
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition relative"
              aria-label="Messages"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 animate-pulse">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              )}
            </Link>

            {isAuthenticated && <NotificationDropdown />}

            {!isAuthenticated ? (
              <button
                onClick={handleGetStarted}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer"
              >
                Get Started
              </button>
            ) : (
              <div className="relative" ref={mobileProfileRef}>
                <button
                  onClick={toggleMobileProfileMenu}
                  className="p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Profile"
                >
                  {userPic ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                      <Image
                        src={userPic}
                        alt={userName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <UserCircleIcon className="h-5 w-5" />
                    </div>
                  )}
                </button>

                {showMobileProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-[60] animate-fadeInDown">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowMobileProfileMenu(false);
                          handleProfileNavigate();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition text-left text-sm cursor-pointer"
                      >
                        <UserCircleIcon className="h-4 w-4 text-slate-400" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMobileProfileMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 transition text-left text-sm cursor-pointer"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition mobile-menu-button cursor-pointer"
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
          className="md:hidden fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-xs flex justify-end"
          ref={mobileMenuRef}
        >
          <div className="w-64 bg-white h-full p-4 flex flex-col justify-between border-l border-slate-200 animate-slideDown">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="text-slate-900 font-bold text-lg">Menu</span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
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
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      {hasUnread && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {isAuthenticated && (
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleProfileNavigate();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <UserCircleIcon className="h-5 w-5 text-slate-400" />
                    <span>Profile</span>
                  </button>
                  <Link
                    href="/community"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <UserGroupIcon className="h-5 w-5 text-slate-400" />
                    <span>Friends</span>
                  </Link>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 text-left cursor-pointer"
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
        <div className="md:hidden fixed inset-0 z-[60] bg-white">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
            <button
              onClick={closeMobileSearch}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeftIcon className="h-5 w-5 text-slate-700" />
            </button>
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search BD BOOK..."
                className="w-full bg-slate-100 text-slate-900 rounded-full py-2.5 pl-10 pr-10 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full cursor-pointer"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
