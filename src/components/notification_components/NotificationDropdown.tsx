"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useSocket } from "@/components/providers/SocketProvider";
import axiosInstance from "@/lib/axios";
import { BellIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface NotificationDropdownProps {
  onClose?: () => void;
}

export const NotificationDropdown = ({ onClose }: NotificationDropdownProps = {}) => {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const fetchInProgress = useRef(false);

  const getNotificationIcon = useCallback((type: string) => {
    const icons: Record<string, string> = {
      post_like: "❤️",
      post_comment: "💬",
      friend_request: "👤",
      friend_accept: "✓",
      message: "💬",
    };
    return icons[type] || "🔔";
  }, []);

  const getNotificationBg = useCallback((type: string) => {
    const bgColors: Record<string, string> = {
      post_like: "bg-red-100 text-red-600",
      post_comment: "bg-[#EEEDFE] text-[#4E4AFC]",
      friend_request: "bg-amber-100 text-amber-600",
      friend_accept: "bg-emerald-100 text-emerald-600",
      message: "bg-[#EEEDFE] text-[#4E4AFC]",
    };
    return bgColors[type] || "bg-slate-100 text-slate-600";
  }, []);

  const formatNotificationTime = useCallback((date: string | Date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  }, []);

  const fetchUnreadNotificationsCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axiosInstance.get("/notifications/unread/count");
      if (response.data?.success) {
        setUnreadCount(response.data.unreadCount);
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
        const response = await axiosInstance.get(`/notifications?page=${pageNum}&limit=20`);
        const data = response.data;
        if (data?.success) {
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
          setUnreadCount(data.unreadCount || 0);
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

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await axiosInstance.patch(`/notifications/${notificationId}/read`);
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
      await axiosInstance.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  }, []);

  const handleNotificationClick = useCallback(
    (notification: any) => {
      markAsRead(notification._id);
      setIsNotificationsOpen(false);
      onClose?.();
      if (
        notification.type === "post_like" ||
        notification.type === "post_comment"
      ) {
        router.push(`/post/details/${notification.data?.postId}`);
      } else if (notification.type === "friend_request") {
        router.push("/community");
      } else if (notification.type === "friend_accept") {
        router.push(`/profile/${notification.data?.senderId || notification.data?.receiverId}`);
      } else if (notification.type === "message") {
        router.push("/message");
      }
    },
    [markAsRead, router, onClose],
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

  useEffect(() => {
    if (page > 1 && initialFetchDone) {
      fetchNotifications(page, true);
    }
  }, [page, fetchNotifications, initialFetchDone]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = (notification: any) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      toast.custom(
        (t) => (
          <div
            className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl p-3 cursor-pointer max-w-sm"
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
                <div className="w-10 h-10 rounded-full bg-[#4E4AFC] flex items-center justify-center">
                  <BellIcon className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-slate-900 text-sm font-normal">
                  {notification.data?.message || "New notification"}
                </p>
                <p className="text-slate-500 text-xs">Just now</p>
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

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchUnreadNotificationsCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadNotificationsCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={notificationsRef}>
      <button
        onClick={() => setIsNotificationsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-all duration-200 cursor-pointer"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-normal text-white animate-pulse px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isNotificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsNotificationsOpen(false)}
          />
          <div className="absolute -right-23 md:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 md:w-80 lg:w-96 rounded-2xl bg-white border border-slate-200 overflow-hidden animate-fadeInDown z-50">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-slate-900 font-normal text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[#4E4AFC] hover:text-[#3F3BE6] font-normal cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div
              ref={notificationsContainerRef}
              onScroll={handleScroll}
              className="max-h-96 overflow-y-auto divide-y divide-slate-100"
            >
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <BellIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No notifications yet</p>
                </div>
              ) : (
                <>
                  {notifications.map((notification) => (
                    <button
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-all duration-150 text-left cursor-pointer ${
                        !notification.isRead ? "bg-[#4E4AFC]/5" : ""
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full ${getNotificationBg(notification.type)} flex items-center justify-center text-lg flex-shrink-0`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${!notification.isRead ? "text-slate-900 font-normal" : "text-slate-600"}`}
                        >
                          {notification.data?.message ||
                            `${notification.type} notification`}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-[#4E4AFC] rounded-full mt-2 flex-shrink-0"></div>
                      )}
                    </button>
                  ))}
                  {loadingNotifications && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-[#4E4AFC]"></div>
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
