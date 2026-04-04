"use client";

import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  Cog6ToothIcon,
  HomeIcon,
  NewspaperIcon,
  UserCircleIcon,
  UserGroupIcon,
  VideoCameraIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const Header = () => {
  const { user, logout, isAuthenticated, initialLoadDone } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessageTime, setLastMessageTime] = useState(null);
  
  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationsContainerRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const messageCountInterval = useRef(null);

  // Navigation items
  const publicNavItems = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Posts", href: "/posts", icon: NewspaperIcon },
    { name: "Videos", href: "/videos", icon: VideoCameraIcon },
  ];

  const privateNavItems = [
    { name: "Message", href: "/message", icon: MessageCircle },
  ];

  const navItems = isAuthenticated 
    ? [...publicNavItems, ...privateNavItems]
    : publicNavItems;

  // Fetch unread messages count with debounce
  const fetchUnreadMessagesCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/users/unread-messages/count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        cache: 'no-store'
      });
      const data = await response.json();
      if (data.success) {
        setUnreadMessagesCount(data.count);
      }
    } catch (error) {
      console.error("Failed to fetch unread messages count:", error);
    }
  }, [isAuthenticated]);

  // Fetch notifications with pagination
  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    if (!isAuthenticated) return;
    if (loadingNotifications) return;
    
    setLoadingNotifications(true);
    try {
      const response = await fetch(`/api/notifications?page=${pageNum}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        cache: 'no-store'
      });
      const data = await response.json();
      if (data.success) {
        if (append) {
          setNotifications(prev => [...prev, ...data.data]);
        } else {
          setNotifications(data.data);
        }
        setUnreadCount(data.unreadCount);
        setHasMore(data.data.length === 20);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [isAuthenticated, loadingNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification._id);
    setIsNotificationsOpen(false);
    
    if (notification.type === 'post_like' || notification.type === 'post_comment') {
      router.push(`/post/details/${notification.data.postId}`);
    } else if (notification.type === 'friend_request') {
      router.push('/friends/requests');
    } else if (notification.type === 'friend_accept') {
      router.push(`/profile/${notification.data.senderId}`);
    } else if (notification.type === 'message') {
      router.push('/message');
    }
  };

  // Handle scroll pagination
  const handleScroll = useCallback(() => {
    if (!notificationsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = notificationsContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore && !loadingNotifications) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, loadingNotifications]);

  // Load more notifications when page changes
  useEffect(() => {
    if (page > 1) {
      fetchNotifications(page, true);
    }
  }, [page, fetchNotifications]);

  // Real-time socket notifications with optimized updates
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = (notification) => {
      setNotifications(prev => {
        // Avoid duplicates
        if (prev.some(n => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
      
      toast.custom((t) => (
        <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl">
          <div className="flex items-center gap-3">
            {notification.data?.senderProfilePicture ? (
              <img 
                src={notification.data.senderProfilePicture} 
                alt="" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <BellIcon className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-white text-sm">{notification.data?.message}</p>
              <p className="text-white/40 text-xs">Just now</p>
            </div>
          </div>
        </div>
      ), { duration: 3000 });
    };

    const handleReceiveMessage = (message) => {
      // Only increment if message is not from current user
      if (message.senderId !== user?._id) {
        setUnreadMessagesCount(prev => prev + 1);
        setLastMessageTime(new Date());
        
        // Show toast for new message
        toast.custom((t) => (
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl cursor-pointer" onClick={() => {
            router.push('/message');
            toast.dismiss(t.id);
          }}>
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
                <p className="text-white text-sm font-medium">{message.senderName || 'Someone'}</p>
                <p className="text-white/60 text-xs truncate">{message.message || "Sent you a message"}</p>
              </div>
            </div>
          </div>
        ), { duration: 4000 });
      }
    };

    const handleMessagesRead = ({ userId, conversationId }) => {
      if (userId === user?._id) {
        // Reset count when messages are read
        fetchUnreadMessagesCount();
      }
    };

    const handleMessageSent = (message) => {
      // Message sent successfully, no need to update count
      console.log("Message sent:", message);
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("messages_read", handleMessagesRead);
    socket.on("message_sent", handleMessageSent);
    
    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_sent", handleMessageSent);
    };
  }, [socket, isAuthenticated, user?._id, router, fetchUnreadMessagesCount]);

  // Periodic refresh of unread messages count (every 30 seconds as fallback)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchUnreadMessagesCount();
    
    // Set up interval for periodic refresh
    messageCountInterval.current = setInterval(() => {
      fetchUnreadMessagesCount();
    }, 30000);
    
    return () => {
      if (messageCountInterval.current) {
        clearInterval(messageCountInterval.current);
      }
    };
  }, [isAuthenticated, fetchUnreadMessagesCount]);

  // Refresh count when user comes back to tab
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadMessagesCount();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, fetchUnreadMessagesCount]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(1, false);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Handle scroll effect for header
  useEffect(() => {
    const handleWindowScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('.mobile-menu-button')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setIsProfileMenuOpen(false);
    router.push("/auth/login");
  };

  const handleGetStarted = () => {
    router.push("/auth/login");
  };

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    setIsNotificationsOpen(false);
  };

  const handleNotificationsClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    setIsProfileMenuOpen(false);
  };

  const handleProfileNavigate = () => {
    setIsProfileMenuOpen(false);
    router.push(`/profile/${user?._id || user?.id}`);
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'post_like': return '❤️';
      case 'post_comment': return '💬';
      case 'friend_request': return '👤';
      case 'friend_accept': return '✓';
      case 'message': return '💬';
      default: return '🔔';
    }
  };

  const getNotificationBg = (type) => {
    switch(type) {
      case 'post_like': return 'bg-red-500/20';
      case 'post_comment': return 'bg-blue-500/20';
      case 'friend_request': return 'bg-yellow-500/20';
      case 'friend_accept': return 'bg-green-500/20';
      case 'message': return 'bg-purple-500/20';
      default: return 'bg-white/10';
    }
  };

  const formatNotificationTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  if (!initialLoadDone) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center shrink-0">
              <Link href="/" className="group">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">BD</span>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                      BD BOOK
                    </h1>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "backdrop-blur-xl bg-black/30 border-b border-white/10 shadow-lg" 
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo */}
            <div className="flex items-center shrink-0">
              <Link href="/" className="group">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                    <span className="text-white font-bold text-lg sm:text-xl">BD</span>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                      BD BOOK
                    </h1>
                    <p className="text-[10px] sm:text-xs text-white/50 hidden sm:block">Connect & Share</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center justify-center space-x-1 lg:space-x-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const isMessage = item.name === "Message";
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
                      <Icon className={`h-4 w-4 transition-all duration-300 ${
                        isActive ? "text-purple-400" : "group-hover:text-purple-400"
                      }`} />
                      <span>{item.name}</span>
                      {hasUnread && (
                        <span className="absolute -top-2 -right-4 min-w-[18px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 animate-pulse">
                          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
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
                  {/* Notifications Button */}
                  <div className="relative" ref={notificationsRef}>
                    <button
                      onClick={handleNotificationsClick}
                      className="relative p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                    >
                      <BellIcon className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notifications Dropdown */}
                    {isNotificationsOpen && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-fadeInDown">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                          <h3 className="text-white font-semibold">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        
                        <div 
                          ref={notificationsContainerRef}
                          onScroll={handleScroll}
                          className="max-h-96 overflow-y-auto"
                        >
                          {notifications.length === 0 ? (
                            <div className="text-center py-8">
                              <BellIcon className="h-12 w-12 text-white/20 mx-auto mb-2" />
                              <p className="text-white/40 text-sm">No notifications yet</p>
                            </div>
                          ) : (
                            <>
                              {notifications.map((notification) => (
                                <button
                                  key={notification._id}
                                  onClick={() => handleNotificationClick(notification)}
                                  className={`w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-all duration-200 text-left ${
                                    !notification.isRead ? 'bg-white/5' : ''
                                  }`}
                                >
                                  <div className={`w-10 h-10 rounded-full ${getNotificationBg(notification.type)} flex items-center justify-center text-xl`}>
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notification.isRead ? 'text-white font-medium' : 'text-white/70'}`}>
                                      {notification.data?.message || `${notification.type} notification`}
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">
                                      {formatNotificationTime(notification.createdAt)}
                                    </p>
                                  </div>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                                  )}
                                </button>
                              ))}
                              {loadingNotifications && (
                                <div className="flex justify-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Button */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                    >
                      {user.profilePicture?.url ? (
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-purple-500/50 group-hover:border-purple-500 transition-all">
                          <Image
                            src={user.profilePicture.url}
                            alt={user.fullName || user.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                          <UserCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      )}
                      <span className="hidden sm:block text-white font-medium text-sm">
                        {user.fullName?.split(" ")[0] || user.name?.split(" ")[0] || "User"}
                      </span>
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-fadeInDown">
                        <div className="py-2">
                          <div className="px-4 py-3 border-b border-white/10">
                            <p className="text-white font-semibold text-sm">
                              {user.fullName || user.name}
                            </p>
                            <p className="text-white/50 text-xs mt-1">{user.email}</p>
                          </div>
                          
                          <button
                            onClick={handleProfileNavigate}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                          >
                            <UserCircleIcon className="h-5 w-5 group-hover:text-purple-400 transition-colors" />
                            <span className="text-sm">Profile</span>
                          </button>
                          
                          <Link
                            href="/community"
                            className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <UserGroupIcon className="h-5 w-5 group-hover:text-purple-400 transition-colors" />
                            <span className="text-sm">Friends</span>
                          </Link>
                          
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <Cog6ToothIcon className="h-5 w-5 group-hover:text-purple-400 transition-colors" />
                            <span className="text-sm">Settings</span>
                          </Link>
                          
                          <div className="border-t border-white/10 my-1"></div>
                          
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
                          >
                            <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                            <span className="text-sm">Log out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={handleGetStarted}
                  className="px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  Get Started
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 mobile-menu-button"
              >
                {isMenuOpen ? (
                  <XMarkIcon className="h-6 w-6 text-white" />
                ) : (
                  <Bars3Icon className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="backdrop-blur-xl bg-black/90 border-t border-white/20 shadow-2xl">
          <div className="flex items-center justify-around px-4 py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isMessage = item.name === "Message";
              const hasUnread = isMessage && unreadMessagesCount > 0;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "text-purple-400"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : ""}`} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 animate-pulse">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </Link>
              );
            })}
            
            {isAuthenticated && (
              <button
                onClick={handleNotificationsClick}
                className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 text-white/60 hover:text-white hover:bg-white/5"
              >
                <BellIcon className="h-5 w-5" />
                <span className="text-[10px] font-medium">Alerts</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Menu */}
      {isMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed inset-0 z-45 mt-16 mx-4 rounded-2xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-slideDown"
          style={{ height: 'auto', maxHeight: 'calc(100vh - 80px)', top: '64px' }}
        >
          <div className="py-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isMessage = item.name === "Message";
              const hasUnread = isMessage && unreadMessagesCount > 0;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 text-white border-l-4 border-purple-500"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${isActive ? "text-purple-400" : ""}`} />
                    {hasUnread && (
                      <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 animate-pulse">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            
            {isAuthenticated && (
              <>
                <Link
                  href="/community"
                  className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserGroupIcon className="h-5 w-5" />
                  <span className="font-medium">Frineds</span>
                </Link>
                
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                  <span className="font-medium">Settings</span>
                </Link>
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
      )}

      <style jsx global>{`
        body {
          padding-top: 64px;
          padding-bottom: 0px;
        }
        @media (min-width: 768px) {
          body {
            padding-top: 80px;
          }
        }
        @media (max-width: 768px) {
          body {
            padding-bottom: 64px;
          }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        .animate-fadeInDown {
          animation: fadeInDown 0.2s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </>
  );
};

export default Header;