"use client";

import { BellIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export const NotificationDropdown = ({ isAuthenticated, socket, user }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const notificationsRef = useRef(null);
  const notificationsContainerRef = useRef(null);
  const router = useRouter();
  const fetchInProgress = useRef(false);

  // ── Helper Functions ─────────────────────────────────────────────
  const getNotificationIcon = useCallback((type) => {
    const icons = {
      post_like: "❤️",
      post_comment: "💬",
      friend_request: "👤",
      friend_accept: "✓",
      message: "💬",
    };
    return icons[type] || "🔔";
  }, []);

  const getNotificationBg = useCallback((type) => {
    const bgColors = {
      post_like: "bg-red-500/20",
      post_comment: "bg-blue-500/20",
      friend_request: "bg-yellow-500/20",
      friend_accept: "bg-green-500/20",
      message: "bg-purple-500/20",
    };
    return bgColors[type] || "bg-white/10";
  }, []);

  const formatNotificationTime = useCallback((date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  }, []);

  // ── API Calls ────────────────────────────────────────────────────
  const fetchUnreadNotificationsCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch("/api/notifications/unread/count", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch unread notifications count:", error);
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(
    async (pageNum = 1, append = false) => {
      if (!isAuthenticated) return;
      if (loadingNotifications || fetchInProgress.current) return;
      fetchInProgress.current = true;
      setLoadingNotifications(true);
      try {
        const response = await fetch(
          `/api/notifications?page=${pageNum}&limit=20`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const data = await response.json();
        if (data.success) {
          if (append) {
            setNotifications((prev) => {
              const newNotifications = [...prev, ...data.data];
              return newNotifications.filter(
                (n, index, self) =>
                  index === self.findIndex((t) => t._id === n._id),
              );
            });
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
        fetchInProgress.current = false;
      }
    },
    [isAuthenticated, loadingNotifications],
  );

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  }, []);

  const handleNotificationClick = useCallback(
    (notification) => {
      markAsRead(notification._id);
      setIsNotificationsOpen(false);
      if (
        notification.type === "post_like" ||
        notification.type === "post_comment"
      ) {
        router.push(`/post/details/${notification.data.postId}`);
      } else if (notification.type === "friend_request") {
        router.push("/friends/requests");
      } else if (notification.type === "friend_accept") {
        router.push(`/profile/${notification.data.senderId}`);
      } else if (notification.type === "message") {
        router.push("/message");
      }
    },
    [markAsRead, router],
  );

  const handleScroll = useCallback(() => {
    if (!notificationsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      notificationsContainerRef.current;
    if (
      scrollTop + clientHeight >= scrollHeight - 100 &&
      hasMore &&
      !loadingNotifications
    ) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, loadingNotifications]);

  // ── Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    if (page > 1 && initialFetchDone) {
      fetchNotifications(page, true);
    }
  }, [page, fetchNotifications, initialFetchDone]);

  // Socket events
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      toast.custom(
        (t) => (
          <div
            className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl cursor-pointer max-w-sm"
            onClick={() => {
              toast.dismiss(t.id);
              handleNotificationClick(notification);
            }}
          >
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
                <p className="text-white text-sm font-medium">
                  {notification.data?.message || "New notification"}
                </p>
                <p className="text-white/40 text-xs">Just now</p>
              </div>
            </div>
          </div>
        ),
        { duration: 4000 },
      );
    };

    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isAuthenticated, handleNotificationClick]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated && !initialFetchDone) {
      fetchNotifications(1, false);
      fetchUnreadNotificationsCount();
      setInitialFetchDone(true);
    }
  }, [
    isAuthenticated,
    initialFetchDone,
    fetchNotifications,
    fetchUnreadNotificationsCount,
  ]);

  // Polling every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchUnreadNotificationsCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadNotificationsCount]);

  // Tab focus refresh
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          fetchUnreadNotificationsCount();
        }, 1000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthenticated, fetchUnreadNotificationsCount]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="relative" ref={notificationsRef}>
      <button
        onClick={() => setIsNotificationsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isNotificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm"
            onClick={() => setIsNotificationsOpen(false)}
          />
          <div className="absolute -right-29 md:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 md:w-80 lg:w-96 rounded-xl backdrop-blur-xl bg-black/90 border border-white/20 shadow-2xl overflow-hidden animate-fadeInDown z-50">
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
                        !notification.isRead ? "bg-white/5" : ""
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${getNotificationBg(notification.type)} flex items-center justify-center text-xl flex-shrink-0`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${!notification.isRead ? "text-white font-medium" : "text-white/70"}`}
                        >
                          {notification.data?.message ||
                            `${notification.type} notification`}
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
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
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;