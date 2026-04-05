"use client";

import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
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
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import NotificationDropdown from "./NotificationDropdown";

const Header = () => {
  const { user, logout, isAuthenticated, initialLoadDone } = useAuth();
  const { socket } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
  // 🔍 Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  const pathname = usePathname();
  const router = useRouter();
  const messageCountInterval = useRef(null);
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);

  const navItems = useMemo(() => {
    const publicNavItems = [
      { name: "Home", href: "/", icon: HomeIcon },
      { name: "Videos", href: "/videos", icon: VideoCameraIcon },
      { name: "Room", href: "/room", icon: VideoCameraSlashIcon },
    ];
    const privateNavItems = [
      { name: "Messages", href: "/message", icon: MessageCircle },
    ];
    return isAuthenticated
      ? [...publicNavItems, ...privateNavItems]
      : publicNavItems;
  }, [isAuthenticated]);

  // 🔍 Fetch search suggestions from backend (users only for suggestions)
  const fetchSearchSuggestions = useCallback(async (query) => {
    if (!query.trim() || query.length < 2 || !isAuthenticated) {
      setSearchSuggestions([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Using your existing /api/users/search/:query endpoint
      const response = await axiosInstance.get(`/users/search/${encodeURIComponent(query)}`, {
        params: { limit: 5 }
      });
      
      if (response.data.success && response.data.data) {
        // Extract unique names for suggestions
        const suggestions = [...new Set(
          response.data.data.map(u => u.fullName).filter(Boolean)
        )].slice(0, 5);
        setSearchSuggestions(suggestions);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setIsSearching(false);
    }
  }, [isAuthenticated]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchSuggestions(value);
        setShowSearchDropdown(true);
      }, 300);
    } else {
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setShowSearchDropdown(false);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    setSearchQuery("");
    setSearchSuggestions([]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSearchDropdown(false);
  };

  // 🔍 Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest(".mobile-menu-button")
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ── Message Count Functions ──────────────────────────────────────
  const fetchUnreadMessagesCount = useCallback(async () => {
    if (!isAuthenticated || fetchInProgress.current) return;
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) return;
    fetchInProgress.current = true;
    lastFetchTime.current = now;
    try {
      const response = await axiosInstance.get("/users/unread-messages/count");
      if (response.data.success) {
        setUnreadMessagesCount(response.data.count);
      }
    } catch (error) {
      console.error("Failed to fetch unread messages count:", error);
    } finally {
      fetchInProgress.current = false;
    }
  }, [isAuthenticated]);

  const fetchUnreadMessagesCountForced = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axiosInstance.get("/users/unread-messages/count");
      if (response.data.success) {
        setUnreadMessagesCount(response.data.count);
        lastFetchTime.current = Date.now();
      }
    } catch (error) {
      console.error("Failed to fetch unread messages count (forced):", error);
    }
  }, [isAuthenticated]);

  // ── Socket Events for Messages ───────────────────────────────────
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewMessage = (message) => {
      if (message.senderId !== user?._id) {
        fetchUnreadMessagesCountForced();
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
                  <img
                    src={message.senderProfilePicture}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {message.senderName || "Someone"}
                  </p>
                  <p className="text-white/60 text-xs truncate">
                    {message.message || "Sent you a message"}
                  </p>
                </div>
              </div>
            </div>
          ),
          { duration: 4000 },
        );
      }
    };

    const handleMessagesRead = () => {
      fetchUnreadMessagesCountForced();
    };

    socket.on("receive_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("receive_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [
    socket,
    isAuthenticated,
    user?._id,
    router,
    fetchUnreadMessagesCountForced,
  ]);

  // ── Message Count Polling ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    messageCountInterval.current = setInterval(() => {
      fetchUnreadMessagesCount();
    }, 30000);
    return () => {
      if (messageCountInterval.current)
        clearInterval(messageCountInterval.current);
    };
  }, [isAuthenticated, fetchUnreadMessagesCount]);

  // ── Tab Focus Refresh ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    let timeoutId;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchUnreadMessagesCountForced();
        }, 1000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, fetchUnreadMessagesCountForced]);

  // ── Scroll Effect ────────────────────────────────────────────────
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

  // ── Route Change Handler ─────────────────────────────────────────
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
    setShowSearchDropdown(false);

    if (pathname === "/message" && isAuthenticated) {
      const timer = setTimeout(() => {
        fetchUnreadMessagesCountForced();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname, isAuthenticated, fetchUnreadMessagesCountForced]);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsProfileMenuOpen(false);
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
    router.push(`/profile/${user?._id || user?.id}`);
  }, [router, user]);

  const Logo = useMemo(
    () => (
      <Link href="/" className="group">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-lg">
            <span className="text-white font-bold text-lg sm:text-xl">BD</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              BD BOOK
            </h1>
            <p className="text-[10px] sm:text-xs text-white/50 hidden sm:block">
              Connect & Share
            </p>
          </div>
        </div>
      </Link>
    ),
    [],
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

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "backdrop-blur-xl bg-black/30 border-b border-white/10 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center shrink-0">{Logo}</div>

            {/* 🔍 Facebook-style Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8 relative" ref={searchRef}>
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

                {/* Search Suggestions Dropdown */}
                {showSearchDropdown && (searchSuggestions.length > 0 || isSearching) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#242526] rounded-xl border border-[#3a3b3c] shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
                        <span className="ml-2 text-white/60 text-sm">Searching...</span>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 py-2 border-b border-[#3a3b3c]">
                          <span className="text-white/40 text-xs">Quick Search</span>
                        </div>
                        {searchSuggestions.map((suggestion, idx) => (
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
                        <button
                          type="button"
                          onClick={() => handleSearchSubmit({ preventDefault: () => {} })}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 transition text-left border-t border-[#3a3b3c]"
                        >
                          <MagnifyingGlassIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                          <span className="text-purple-300 text-sm font-medium">
                            Search for "{searchQuery}" in all posts & people
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center justify-center space-x-1 lg:space-x-2">
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
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  <NotificationDropdown isAuthenticated={isAuthenticated} socket={socket} user={user} />

                  {/* Profile */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                    >
                      {user.profilePicture?.url ? (
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-purple-500/50 group-hover:border-purple-500 transition-all">
                          <Image src={user.profilePicture.url} alt={user.fullName} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                          <UserCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      )}
                      <span className="hidden sm:block text-white font-medium text-sm">
                        {user.fullName?.split(" ")[0] || "User"}
                      </span>
                    </button>

                    {isProfileMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-fadeInDown z-50">
                          <div className="py-2">
                            <div className="px-4 py-3 border-b border-white/10">
                              <p className="text-white font-semibold text-sm">{user.fullName || user.name}</p>
                              <p className="text-white/50 text-xs mt-1 truncate">{user.email}</p>
                            </div>
                            <button onClick={handleProfileNavigate} className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                              <UserCircleIcon className="h-5 w-5 group-hover:text-purple-400" />
                              <span className="text-sm">Profile</span>
                            </button>
                            <Link href="/community" className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group" onClick={() => setIsProfileMenuOpen(false)}>
                              <UserGroupIcon className="h-5 w-5 group-hover:text-purple-400" />
                              <span className="text-sm">Friends</span>
                            </Link>
                            <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group" onClick={() => setIsProfileMenuOpen(false)}>
                              <Cog6ToothIcon className="h-5 w-5 group-hover:text-purple-400" />
                              <span className="text-sm">Settings</span>
                            </Link>
                            <div className="border-t border-white/10 my-1"></div>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group">
                              <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                              <span className="text-sm">Log out</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <button onClick={handleGetStarted} className="px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base">
                  Get Started
                </button>
              )}

              {/* Mobile Menu Button */}
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 mobile-menu-button" aria-label="Menu">
                {isMenuOpen ? <XMarkIcon className="h-6 w-6 text-white" /> : <Bars3Icon className="h-6 w-6 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 🔍 Mobile Search Bar */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 px-4 py-2 bg-[#18191a]/95 backdrop-blur-xl border-b border-white/10">
        <div className="relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSearchDropdown(true)}
              placeholder="Search..."
              className="w-full bg-[#3a3b3c] text-white rounded-full py-2.5 pl-10 pr-10 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition">
                <XMarkIcon className="h-4 w-4 text-white/60" />
              </button>
            )}
          </form>

          {/* Mobile Search Suggestions */}
          {showSearchDropdown && (searchSuggestions.length > 0 || isSearching) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#242526] rounded-xl border border-[#3a3b3c] shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                searchSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#3a3b3c] transition text-left"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 text-white/40 flex-shrink-0" />
                    <span className="text-white text-sm">{suggestion}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="backdrop-blur-xl bg-black/90 border-t border-white/20 shadow-2xl">
          <div className="flex items-center justify-around px-4 py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isMessage = item.name === "Messages";
              const hasUnread = isMessage && unreadMessagesCount > 0;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ${
                    isActive ? "text-purple-400" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : ""}`} />
                  <span className="text-[10px] font-medium">{item.name === "Messages" ? "Msg" : item.name}</span>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 animate-pulse">
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Menu */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMenuOpen(false)} />
          <div ref={mobileMenuRef} className="md:hidden fixed inset-x-4 top-36 z-45 rounded-2xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-slideDown">
            <div className="py-3 overflow-y-auto max-h-[calc(100vh-100px)]">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const isMessage = item.name === "Messages";
                const hasUnread = isMessage && unreadMessagesCount > 0;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                      isActive ? "bg-white/10 text-white border-l-4 border-purple-500" : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="relative">
                      <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : ""}`} />
                      {hasUnread && (
                        <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 animate-pulse">
                          {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              {isAuthenticated && (
                <>
                  <Link href="/community" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200" onClick={() => setIsMenuOpen(false)}>
                    <UserGroupIcon className="h-5 w-5" />
                    <span className="font-medium">Friends</span>
                  </Link>
                  <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200" onClick={() => setIsMenuOpen(false)}>
                    <Cog6ToothIcon className="h-5 w-5" />
                    <span className="font-medium">Settings</span>
                  </Link>
                  <div className="border-t border-white/10 my-2"></div>
                  <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200">
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="font-medium">Log out</span>
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <div className="border-t border-white/10 mt-2 pt-2">
                  <button onClick={() => { setIsMenuOpen(false); handleGetStarted(); }} className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200">
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="font-medium">Get Started</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        body { padding-top: 64px; padding-bottom: 0px; }
        @media (min-width: 768px) { body { padding-top: 80px; } }
        @media (max-width: 768px) { body { padding-top: 120px; padding-bottom: 64px; } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .animate-fadeInDown { animation: fadeInDown 0.2s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-pulse { animation: pulse 2s infinite; }
      `}</style>
    </>
  );
};

export default Header;