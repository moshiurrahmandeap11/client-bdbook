"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useSocket } from "./SocketProvider";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";
import { Bell } from "lucide-react";

export interface INotificationItem {
  _id: string;
  id?: string;
  userId: string;
  actorId?: string | null;
  type: string;
  title?: string | null;
  message: string;
  postId?: string | null;
  commentId?: string | null;
  requestId?: string | null;
  isRead: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  actor?: {
    id: string;
    fullName: string;
    username?: string;
    profilePicUrl?: string | null;
  } | null;
  data?: {
    postId?: string | null;
    commentId?: string | null;
    requestId?: string | null;
    actorId?: string | null;
    actorName?: string | null;
    actorUsername?: string | null;
    actorProfilePicture?: string | null;
    message?: string;
    senderId?: string | null;
    senderUsername?: string | null;
    receiverId?: string | null;
  };
}

interface NotificationContextType {
  notifications: INotificationItem[];
  unreadCount: number;
  loadingNotifications: boolean;
  hasMore: boolean;
  page: number;
  isDrawerOpen: boolean;
  activeTab: "all" | "unread";
  setActiveTab: (tab: "all" | "unread") => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  fetchNotifications: (pageNum?: number, append?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  handleNotificationClick: (notification: INotificationItem) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const fetchInProgress = useRef(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(
    () => setIsDrawerOpen((prev) => !prev),
    []
  );

  const fetchUnreadNotificationsCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axiosInstance.get("/notifications/unread/count");
      if (response.data?.success) {
        setUnreadCount(response.data.unreadCount ?? 0);
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
        const response = await axiosInstance.get(
          `/notifications?page=${pageNum}&limit=20`
        );
        const data = response.data;
        if (data?.success) {
          if (append) {
            setNotifications((prev) => {
              const newNotifications = [...prev, ...data.data];
              return newNotifications.filter(
                (n, index, self) =>
                  index === self.findIndex((t) => t._id === n._id)
              );
            });
          } else {
            setNotifications(data.data || []);
          }
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
          setHasMore((data.data || []).length === 20);
          setPage(pageNum);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoadingNotifications(false);
        fetchInProgress.current = false;
      }
    },
    [isAuthenticated, loadingNotifications]
  );

  // Optimistic mark as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Optimistically update local state immediately
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await axiosInstance.patch(`/notifications/${notificationId}/read`);
      } catch (error) {
        console.error("Failed to mark notification as read on server:", error);
      }
    },
    []
  );

  // Optimistic mark all as read
  const markAllAsRead = useCallback(async () => {
    // Optimistically update local state immediately
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await axiosInstance.patch("/notifications/read-all");
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
      fetchUnreadNotificationsCount();
    }
  }, [fetchUnreadNotificationsCount]);

  const handleNotificationClick = useCallback(
    (notification: INotificationItem) => {
      if (!notification.isRead) {
        markAsRead(notification._id);
      }
      setIsDrawerOpen(false);

      const targetPostId =
        notification.data?.postId || notification.postId;
      const targetSenderUsername =
        notification.actor?.username ||
        notification.data?.senderUsername ||
        notification.data?.actorUsername;
      const targetSenderId =
        notification.data?.senderId ||
        notification.data?.receiverId ||
        notification.actorId ||
        notification.actor?.id;

      if (
        notification.type === "post_like" ||
        notification.type === "post_comment"
      ) {
        if (targetPostId) {
          router.push(`/post/details/${targetPostId}`);
        }
      } else if (notification.type === "follow") {
        if (targetSenderUsername) {
          router.push(`/s/${targetSenderUsername}`);
        } else if (targetSenderId) {
          router.push(`/s/${targetSenderId}`);
        }
      } else if (notification.type === "friend_request") {
        router.push("/community");
      } else if (notification.type === "friend_accept") {
        if (targetSenderUsername) {
          router.push(`/s/${targetSenderUsername}`);
        } else if (targetSenderId) {
          router.push(`/s/${targetSenderId}`);
        } else {
          router.push("/community");
        }
      } else if (notification.type === "message") {
        router.push("/message");
      }
    },
    [markAsRead, router]
  );

  // Real-time socket events
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = (notification: INotificationItem) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);

      const actorPic =
        notification.data?.actorProfilePicture ||
        notification.actor?.profilePicUrl;
      const messageText =
        notification.data?.message ||
        notification.message ||
        "New notification";

      toast.custom(
        (t) => (
          <div
            className="bg-white border border-slate-200 rounded-md p-3.5 cursor-pointer max-w-sm flex items-center gap-3 transition-colors hover:bg-slate-50"
            onClick={() => {
              toast.dismiss(t.id);
              handleNotificationClick(notification);
            }}
          >
            {actorPic ? (
              <img
                src={actorPic}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#4E4AFC] flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 text-sm font-normal line-clamp-2">
                {messageText}
              </p>
              <p className="text-slate-400 text-xs mt-0.5 font-normal">Just now</p>
            </div>
          </div>
        ),
        { duration: 4000 }
      );
    };

    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isAuthenticated, handleNotificationClick]);

  // Initial fetch on authentication
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

  // Periodic polling for unread count
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchUnreadNotificationsCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadNotificationsCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loadingNotifications,
        hasMore,
        page,
        isDrawerOpen,
        activeTab,
        setActiveTab,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        handleNotificationClick,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

