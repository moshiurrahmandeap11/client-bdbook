"use client";

import { useSocket } from "@/components/providers/SocketProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import axiosInstance from "@/lib/axios";
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
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
  const [ctaHover, setCtaHover] = useState(false);

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

  const navItems = useMemo(() => [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Videos", href: "/videos", icon: VideoCameraIcon },
    { name: "Messages", href: "/message", icon: MessageCircle },
    { name: "Room", href: "/room", icon: VideoCameraSlashIcon },
  ], []);

  const { data: suggestionsData, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const response = await axiosInstance.get(`/users/search/${encodeURIComponent(searchQuery)}`, {
        params: { limit: 5 }
      });
      if (!response.data.success) return [];
      return [...new Set((response.data.data as any[]).map((u: any) => u.fullName).filter(Boolean))].slice(0, 5);
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
    setShowMobileProfileMenu(prev => !prev);
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
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(target)) {
        setShowMobileProfileMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target) && !(target as HTMLElement).closest(".mobile-menu-button")) {
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
              className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl cursor-pointer max-w-sm"
              onClick={() => {
                toast.dismiss(t.id);
                router.push("/message");
              }}
            >
              <div className="flex items-center gap-3">
                {message.senderProfilePicture ? (
                  <img src={message.senderProfilePicture} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{message.senderName || "Someone"}</p>
                  <p className="text-white/60 text-xs truncate">{message.message || "Sent you a message"}</p>
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
    <button onClick={handleHomeClick} className="group">
      <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-lg">
        <span className="text-white font-bold text-xl">BD</span>
      </div>
    </button>
  );

  if (!initialLoadDone) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center shrink-0">{Logo}</div>
          </div>
        </div>
      </header>
    );
  }

  const suggestions = suggestionsData || [];
  const isSearching = isSuggestionsLoading;
  const userPic = (typeof user?.profilePicture === "object" ? user?.profilePicture?.url : user?.profilePicture) || user?.avatar || null;
  const userName = user?.fullName || user?.name || "User";

  return (
    <>
      {/* DESKTOP HEADER */}
      <header
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "backdrop-blur-xl bg-black/30 border-b border-white/10 shadow-lg"
            : "bg-black/20 backdrop-blur-md border-b border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-4 flex-1">
              {Logo}
              
              <div className="flex-1 max-w-xl relative" ref={searchRef}>
                <form onSubmit={handleSearchSubmit} className="w-full relative">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => searchQuery.trim().length >= 2 && setShowSearchDropdown(true)}
                      placeholder="Search BD BOOK..."
                      className="w-full bg-[#3a3b3c] text-white rounded-full py-2.5 pl-10 pr-10 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition"
                      >
                        <XMarkIcon className="h-4 w-4 text-white/60" />
                      </button>
                    )}
                  </div>

                  {(showSearchDropdown || isSearching) && searchQuery.trim().length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#242526] rounded-xl border border-[#3a3b3c] shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-white/40 text-sm">Searching...</div>
                      ) : suggestions.length > 0 ? (
                        <>
                          <div className="px-4 py-2 border-b border-[#3a3b3c]">
                            <span className="text-white/40 text-xs">Quick Search</span>
                          </div>
                          {suggestions.map((suggestion: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#3a3b3c] transition text-left"
                            >
                              <MagnifyingGlassIcon className="h-4 w-4 text-white/40 flex-shrink-0" />
                              <span className="text-white text-sm">{suggestion}</span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-4 py-6 text-center text-white/40 text-sm">No results found</div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right: Navigation + Profile */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center justify-center space-x-1 lg:space-x-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const isMessage = item.name === "Messages";
                  const hasUnread = isMessage && unreadMessagesCount > 0;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 group ${
                        isActive
                          ? "text-white bg-white/10 backdrop-blur-sm"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 relative">
                        <Icon className={`h-4 w-4 transition-all duration-300 ${isActive ? "text-purple-400" : "group-hover:text-purple-400"}`} />
                        <span>{item.name}</span>
                        {hasUnread && (
                          <span className="absolute -top-2 -right-4 min-w-[18px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 animate-pulse">
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
                  onMouseEnter={() => setCtaHover(true)}
                  onMouseLeave={() => setCtaHover(false)}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all duration-200"
                  style={{
                    background: ctaHover 
                      ? "linear-gradient(135deg, #8b5cf6, #3b82f6)" 
                      : "linear-gradient(135deg, #7c3aed, #2563eb)",
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                </button>
              ) : (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                  >
                    {userPic ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/50 group-hover:border-purple-500 transition-all">
                        <Image src={userPic} alt={userName} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                        <UserCircleIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <span className="text-white font-medium text-sm">
                      {userName.split(" ")[0]}
                    </span>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-fadeInDown z-50">
                      <div className="py-2">
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-white font-semibold text-sm">{userName}</p>
                          <p className="text-white/50 text-xs mt-1 truncate">{user?.email || ""}</p>
                        </div>
                        <button onClick={() => { setIsProfileMenuOpen(false); handleProfileNavigate(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group text-left">
                          <UserCircleIcon className="h-5 w-5 group-hover:text-purple-400" />
                          <span className="text-sm">Profile</span>
                        </button>
                        <Link href="/community" className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group" onClick={() => setIsProfileMenuOpen(false)}>
                          <UserGroupIcon className="h-5 w-5 group-hover:text-purple-400" />
                          <span className="text-sm">Friends</span>
                        </Link>
                        <div className="border-t border-white/10 my-1"></div>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group text-left">
                          <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                          <span className="text-sm">Log out</span>
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
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#242526] border-b border-white/10">
        <div className="px-4 h-16 flex items-center justify-between">
          {Logo}

          <div className="flex-1"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={openMobileSearch}
              className="p-2 rounded-full hover:bg-white/10 transition"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5 text-white" />
            </button>

            {/* Direct Messages Icon on Mobile Header */}
            <Link
              href="/message"
              className="p-2 rounded-full hover:bg-white/10 transition relative text-white"
              aria-label="Messages"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 animate-pulse">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              )}
            </Link>

            {isAuthenticated && (
              <NotificationDropdown />
            )}

            {!isAuthenticated ? (
              <button
                onClick={handleGetStarted}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg"
              >
                Get Started
              </button>
            ) : (
              <div className="relative" ref={mobileProfileRef}>
                <button
                  onClick={toggleMobileProfileMenu}
                  className="p-1 rounded-full hover:bg-white/10 transition"
                  aria-label="Profile"
                >
                  {userPic ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-purple-500/50">
                      <Image src={userPic} alt={userName} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                      <UserCircleIcon className="h-5 w-5 text-white" />
                    </div>
                  )}
                </button>

                {showMobileProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#242526] border border-white/10 shadow-2xl overflow-hidden z-[60] animate-fadeInDown">
                    <div className="py-2">
                      <button onClick={() => { setShowMobileProfileMenu(false); handleProfileNavigate(); }} className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition text-left">
                        <UserCircleIcon className="h-5 w-5" />
                        <span className="text-sm">Profile</span>
                      </button>
                      <button onClick={() => { setShowMobileProfileMenu(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition text-left">
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span className="text-sm">Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-white/10 transition mobile-menu-button"
              aria-label="Menu"
            >
              {isMenuOpen ? <XMarkIcon className="h-5 w-5 text-white" /> : <Bars3Icon className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex justify-end" ref={mobileMenuRef}>
          <div className="w-64 bg-[#18191a] h-full p-4 flex flex-col justify-between border-l border-white/10 animate-fadeInLeft">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <span className="text-white font-bold text-lg">Menu</span>
                <button onClick={() => setIsMenuOpen(false)} className="p-1 rounded-full text-white/70 hover:text-white">
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
                        isActive ? "bg-purple-600/30 text-purple-300 border border-purple-500/30" : "text-white/80 hover:bg-white/10"
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
                <div className="mt-6 pt-4 border-t border-white/10 space-y-1">
                  <button
                    onClick={() => { setIsMenuOpen(false); handleProfileNavigate(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 text-left"
                  >
                    <UserCircleIcon className="h-5 w-5" />
                    <span>Profile</span>
                  </button>
                  <Link
                    href="/community"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10"
                  >
                    <UserGroupIcon className="h-5 w-5" />
                    <span>Friends</span>
                  </Link>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 text-left"
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
        <div className="md:hidden fixed inset-0 z-[60] bg-[#242526]">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <button onClick={closeMobileSearch} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
              <ArrowLeftIcon className="h-5 w-5 text-white" />
            </button>
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search BD BOOK..."
                className="w-full bg-[#3a3b3c] text-white rounded-full py-2.5 pl-10 pr-10 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full">
                  <XMarkIcon className="h-4 w-4 text-white/60" />
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
