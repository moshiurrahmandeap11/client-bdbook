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
// [wip step 1/2]
