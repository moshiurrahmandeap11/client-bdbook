"use client";

import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SearchSuggestionSkeleton } from "../Skeleton";
import NotificationDropdown from "./NotificationDropdown";

const Header = () => {
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

  // Swipe navigation states
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const searchRef = useRef(null);
  const mobileProfileRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  
  const pathname = usePathname();
  const router = useRouter();

  const queryClient = useQueryClient();

  const handleHomeClick = () => {
    if(pathname === "/") {
      queryClient.refetchQueries({ queryKey: ["home-posts"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  }

  // Hide swipe hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Navigation items in order for swipe navigation
  const navItemsInOrder = useMemo(() => {
    const items = [
      { name: "Home", href: "/", icon: HomeIcon },
      { name: "Videos", href: "/videos", icon: VideoCameraIcon },
      { name: "Room", href: "/room", icon: VideoCameraSlashIcon },
    ];
    if (isAuthenticated) {
      items.push({ name: "Messages", href: "/message", icon: MessageCircle });
    }
    return items;
  }, [isAuthenticated]);

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

  // Get current index for swipe navigation
  const currentIndex = useMemo(() => {
    return navItemsInOrder.findIndex(item => item.href === pathname);
  }, [pathname, navItemsInOrder]);

  // Handle swipe navigation on the entire page
  useEffect(() => {
    // Only add swipe listeners on mobile devices
    if (typeof window === 'undefined') return;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const handleTouchStartGlobal = (e) => {
      // Don't trigger swipe if touching interactive elements
      const target = e.target;
      const isInteractive = 
        target.closest('button') || 
        target.closest('a') || 
        target.closest('input') || 
        target.closest('textarea') ||
        target.closest('[role="button"]') ||
        target.closest('.no-swipe');
      
      if (!isInteractive) {
        setTouchStart({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        });
        setTouchEnd({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        });
        setIsSwiping(true);
      }
    };

    const handleTouchMoveGlobal = (e) => {
      if (!isSwiping) return;
      setTouchEnd({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
      
      // Show direction indicator
      const deltaX = e.touches[0].clientX - touchStart.x;
      if (Math.abs(deltaX) > 30) {
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');
      }
    };

    const handleTouchEndGlobal = () => {
      if (!isSwiping) {
        setSwipeDirection(null);
        return;
      }
      
      const deltaX = touchEnd.x - touchStart.x;
      const deltaY = touchEnd.y - touchStart.y;
      
      // Only trigger horizontal swipe if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Right swipe - go to previous
          if (currentIndex > 0) {
            const prevItem = navItemsInOrder[currentIndex - 1];
            if (prevItem) {
              router.push(prevItem.href);
              // Haptic feedback (vibration) if supported
              if (navigator.vibrate) navigator.vibrate(50);
            }
          }
        } else if (deltaX < 0) {
          // Left swipe - go to next
          if (currentIndex < navItemsInOrder.length - 1) {
            const nextItem = navItemsInOrder[currentIndex + 1];
            if (nextItem) {
              router.push(nextItem.href);
              // Haptic feedback (vibration) if supported
              if (navigator.vibrate) navigator.vibrate(50);
            }
          }
        }
      }
      
      // Reset states
      setIsSwiping(false);
      setSwipeDirection(null);
      setTouchStart({ x: 0, y: 0 });
      setTouchEnd({ x: 0, y: 0 });
    };

    document.addEventListener('touchstart', handleTouchStartGlobal, { passive: false });
    document.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    document.addEventListener('touchend', handleTouchEndGlobal);

    return () => {
      document.removeEventListener('touchstart', handleTouchStartGlobal);
      document.removeEventListener('touchmove', handleTouchMoveGlobal);
      document.removeEventListener('touchend', handleTouchEndGlobal);
    };
  }, [isSwiping, touchStart.x, touchEnd.x, currentIndex, navItemsInOrder, router]);

  // Search suggestions using TanStack Query
  const { data: suggestionsData, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const response = await axiosInstance.get(`/users/search/${encodeURIComponent(searchQuery)}`, {
        params: { limit: 5 }
      });
      if (!response.data.success) return [];
      return [...new Set(response.data.data.map(u => u.fullName).filter(Boolean))].slice(0, 5);
    },
    enabled: isAuthenticated && searchQuery.trim().length >= 2,
    staleTime: 3 * 60 * 1000,
  });

  // Unread messages count
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

  const handleSearchChange = (e) => {
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

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      setShowMobileSearch(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleSuggestionClick = (suggestion) => {
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

  // Close all dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(event.target)) {
        setShowMobileProfileMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest(".mobile-menu-button")) {
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

  // Socket events
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewMessage = (message) => {
      if (message.senderId !== user?._id) {
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
  }, [socket, isAuthenticated, user?._id, router]);

  // Scroll effect
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

  // Route change handler - close all menus
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

  // Logo component
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

  // Swipe direction indicator overlay
  const SwipeDirectionOverlay = () => {
    if (!swipeDirection || !showSwipeHint) return null;
    
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
        <div className={`bg-black/50 backdrop-blur-sm rounded-full p-4 transition-all duration-200 ${swipeDirection === 'left' ? 'animate-swipe-left' : 'animate-swipe-right'}`}>
          <span className="text-white text-4xl">
            {swipeDirection === 'left' ? '←' : '→'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Swipe direction indicator */}
      <SwipeDirectionOverlay />

      {/* ==================== DESKTOP HEADER ==================== */}
      <header
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "backdrop-blur-xl bg-black/30 border-b border-white/10 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-4 flex-1">
              {Logo}
              
              {/* Desktop Search Bar */}
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

                  {/* Search Suggestions */}
                  {(showSearchDropdown || isSearching) && searchQuery.trim().length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#242526] rounded-xl border border-[#3a3b3c] shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                      {isSearching ? (
                        <SearchSuggestionSkeleton />
                      ) : suggestions.length > 0 ? (
                        <>
                          <div className="px-4 py-2 border-b border-[#3a3b3c]">
                            <span className="text-white/40 text-xs">Quick Search</span>
                          </div>
                          {suggestions.map((suggestion, idx) => (
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
                      ) : searchQuery.trim().length >= 2 ? (
                        <div className="px-4 py-6 text-center text-white/40 text-sm">
                          No results found
                        </div>
                      ) : null}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right: Navigation + Profile / Get Started */}
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
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <NotificationDropdown isAuthenticated={isAuthenticated} socket={socket} user={user} />

              {/* Get Started Button for Unauthenticated Users */}
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
                    boxShadow: ctaHover 
                      ? "0 8px 20px rgba(124,58,237,0.4)" 
                      : "0 4px 12px rgba(124,58,237,0.25)",
                    transform: ctaHover ? "translateY(-1px)" : "translateY(0)",
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                </button>
              ) : (
                /* Profile Button for Authenticated Users */
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                  >
                    {user?.profilePicture?.url ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/50 group-hover:border-purple-500 transition-all">
                        <Image src={user.profilePicture.url} alt={user?.fullName || "User"} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                        <UserCircleIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <span className="text-white font-medium text-sm">
                      {user?.fullName?.split(" ")[0] || "User"}
                    </span>
                  </button>

                  {isProfileMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-fadeInDown z-50">
                        <div className="py-2">
                          <div className="px-4 py-3 border-b border-white/10">
                            <p className="text-white font-semibold text-sm">{user?.fullName || user?.name || "User"}</p>
                            <p className="text-white/50 text-xs mt-1 truncate">{user?.email || ""}</p>
                          </div>
                          <button onClick={() => { setIsProfileMenuOpen(false); handleProfileNavigate(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group">
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================== MOBILE HEADER ==================== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#242526] border-b border-white/10">
        <div className="px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          {Logo}

          {/* Center: Spacer */}
          <div className="flex-1"></div>

          {/* Right: Icons Group - Search + Notifications + Profile/Menu */}
          <div className="flex items-center gap-2">
            {/* Search Icon */}
            <button
              onClick={openMobileSearch}
              className="p-2 rounded-full hover:bg-white/10 transition"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5 text-white" />
            </button>

            {/* Notification Icon */}
            {isAuthenticated && (
              <NotificationDropdown isAuthenticated={isAuthenticated} socket={socket} user={user} />
            )}

            {/* Get Started Button for Unauthenticated Users */}
            {!isAuthenticated ? (
              <button
                onClick={handleGetStarted}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg"
              >
                Get Started
              </button>
            ) : (
              /* Profile / Menu for Authenticated Users */
              <div className="relative" ref={mobileProfileRef}>
                <button
                  onClick={toggleMobileProfileMenu}
                  className="p-1 rounded-full hover:bg-white/10 transition"
                  aria-label="Profile"
                >
                  {user?.profilePicture?.url ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-purple-500/50">
                      <Image src={user.profilePicture.url} alt={user?.fullName || "User"} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                      <UserCircleIcon className="h-5 w-5 text-white" />
                    </div>
                  )}
                </button>

                {showMobileProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-[55] bg-black/50" onClick={() => setShowMobileProfileMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#242526] border border-white/10 shadow-2xl overflow-hidden z-[60] animate-fadeInDown">
                      <div className="py-2">
                        <button onClick={() => { setShowMobileProfileMenu(false); handleProfileNavigate(); }} className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition text-left">
                          <UserCircleIcon className="h-5 w-5" />
                          <span className="text-sm">Profile</span>
                        </button>
                        <Link href="/community" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition" onClick={() => setShowMobileProfileMenu(false)}>
                          <UserGroupIcon className="h-5 w-5" />
                          <span className="text-sm">Friends</span>
                        </Link>
                        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition" onClick={() => setShowMobileProfileMenu(false)}>
                          <Cog6ToothIcon className="h-5 w-5" />
                          <span className="text-sm">Settings</span>
                        </Link>
                        <div className="border-t border-white/10 my-1"></div>
                        <button onClick={() => { setShowMobileProfileMenu(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition text-left">
                          <ArrowRightOnRectangleIcon className="h-5 w-5" />
                          <span className="text-sm">Log out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Menu Button (Hamburger) */}
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

      {/* ==================== MOBILE SEARCH OVERLAY ==================== */}
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

          <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
            {isSearching ? (
              <SearchSuggestionSkeleton />
            ) : suggestions.length > 0 && searchQuery.trim().length >= 2 ? (
              <div className="py-2">
                <div className="px-4 py-2 border-b border-white/10">
                  <span className="text-white/40 text-xs">Quick Search</span>
                </div>
                {suggestions.map((suggestion, idx) => (
                  <button key={idx} type="button" onClick={() => handleSuggestionClick(suggestion)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left">
                    <MagnifyingGlassIcon className="h-4 w-4 text-white/40 flex-shrink-0" />
                    <span className="text-white text-sm">{suggestion}</span>
                  </button>
                ))}
                <button type="button" onClick={() => handleSearchSubmit({ preventDefault: () => {} })} className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 transition text-left border-t border-white/10">
                  <MagnifyingGlassIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className="text-purple-300 text-sm font-medium">
                    Search for "{searchQuery}" in all posts & people
                  </span>
                </button>
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="text-center py-12 text-white/40">
                <p>No results found</p>
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <p className="text-sm">Type to search...</p>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div ref={mobileMenuRef} className="md:hidden fixed inset-x-4 top-20 z-45 rounded-2xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-slideDown">
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
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleGetStarted();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
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
        @media (max-width: 768px) { body { padding-bottom: 64px; } }
        
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes swipeLeft {
          0% { opacity: 0; transform: translateX(20px); }
          50% { opacity: 1; transform: translateX(-10px); }
          100% { opacity: 0; transform: translateX(-40px); }
        }
        @keyframes swipeRight {
          0% { opacity: 0; transform: translateX(-20px); }
          50% { opacity: 1; transform: translateX(10px); }
          100% { opacity: 0; transform: translateX(40px); }
        }
        
        .animate-fadeInDown { animation: fadeInDown 0.2s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-pulse { animation: pulse 2s infinite; }
        .animate-swipe-left { animation: swipeLeft 0.3s ease-out forwards; }
        .animate-swipe-right { animation: swipeRight 0.3s ease-out forwards; }
      `}</style>
    </>
  );
};

export default Header;