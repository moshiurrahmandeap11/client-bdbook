// Notification Drawer
"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  useNotifications,
  INotificationItem,
} from "@/components/providers/NotificationProvider";
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  Inbox,
  MessageCircle,
  MessageSquare,
  User,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

// Professional icon badge resolver (NO emojis)
const getNotificationTypeConfig = (type: string) => {
  switch (type) {
    case "post_like":
      return {
        badgeBg: "bg-rose-500",
        icon: <Heart className="w-3 h-3 text-white fill-white" />,
        label: "Like",
      };
    case "post_comment":
      return {
        badgeBg: "bg-[#4E4AFC]",
        icon: <MessageSquare className="w-3 h-3 text-white fill-white" />,
        label: "Comment",
      };
    case "friend_request":
      return {
        badgeBg: "bg-blue-600",
        icon: <UserPlus className="w-3 h-3 text-white" />,
        label: "Friend Request",
      };
    case "friend_accept":
      return {
        badgeBg: "bg-emerald-600",
        icon: <UserCheck className="w-3 h-3 text-white" />,
        label: "Accepted",
      };
    case "message":
      return {
        badgeBg: "bg-indigo-600",
        icon: <MessageCircle className="w-3 h-3 text-white fill-white" />,
        label: "Message",
      };
    default:
      return {
        badgeBg: "bg-slate-600",
        icon: <Bell className="w-3 h-3 text-white" />,
        label: "Notification",
      };
  }
};

const formatRelativeTime = (dateInput: string | Date) => {
  if (!dateInput) return "Just now";
  const now = new Date();
  const date = new Date(dateInput);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const NotificationTrigger = ({
  className = "",
}: {
  className?: string;
}) => {
  const { unreadCount, toggleDrawer } = useNotifications();

  return (
    <button
      onClick={toggleDrawer}
      type="button"
      className={`relative p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer ${className}`}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-normal text-white px-1 animate-pulse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export const NotificationDrawer = () => {
  const {
    notifications,
    unreadCount,
    loadingNotifications,
    hasMore,
    page,
    isDrawerOpen,
    activeTab,
    setActiveTab,
    closeDrawer,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loadingNotifications || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 120) {
      fetchNotifications(page + 1, true);
    }
  }, [loadingNotifications, hasMore, page, fetchNotifications]);

  // Filter items based on active tab
  const displayedNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <>
      {/* Transparent Click-outside Backdrop (Zero blur, zero black tint) */}
      <div
        className={`fixed inset-0 z-[90] bg-transparent ${
          isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden={!isDrawerOpen}
      />

      {/* Fluid Right Drawer with smooth, slower slide transition (500ms) */}
      <div
        className={`fixed top-0 bottom-0 right-0 z-[100] w-full sm:w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isDrawerOpen
            ? "translate-x-0 pointer-events-auto"
            : "translate-x-full pointer-events-none"
        }`}
        role="dialog"
        aria-modal={isDrawerOpen}
        aria-hidden={!isDrawerOpen}
        aria-label="Notifications panel"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-slate-900">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-normal bg-[#4E4AFC]/10 text-[#4E4AFC] rounded-full transition-all duration-200">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal text-[#4E4AFC] hover:bg-[#4E4AFC]/10 rounded-md transition-colors cursor-pointer"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}

              <button
                type="button"
                onClick={closeDrawer}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                aria-label="Close notifications drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Facebook-style Fluid Segmented Control Tabs */}
          <div className="relative p-1 bg-slate-100 rounded-lg border border-slate-200/60 grid grid-cols-2">
            {/* Sliding Active Pill Indicator */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                activeTab === "all"
                  ? "translate-x-1"
                  : "translate-x-[calc(100%+3px)]"
              }`}
            />

            {/* All Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`relative z-10 py-1.5 text-xs text-center flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer ${
                activeTab === "all"
                  ? "text-slate-900 font-medium"
                  : "text-slate-500 hover:text-slate-800 font-normal"
              }`}
            >
              <span>All</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] transition-colors duration-200 ${
                  activeTab === "all"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-slate-200/80 text-slate-500"
                }`}
              >
                {notifications.length}
              </span>
            </button>

            {/* Unread Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`relative z-10 py-1.5 text-xs text-center flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer ${
                activeTab === "unread"
                  ? "text-slate-900 font-medium"
                  : "text-slate-500 hover:text-slate-800 font-normal"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] transition-colors duration-200 ${
                    activeTab === "unread"
                      ? "bg-[#4E4AFC] text-white"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List with smooth content transition */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white"
        >
          <div
            key={activeTab}
            className="animate-in fade-in duration-200 divide-y divide-slate-100"
          >
            {displayedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Inbox className="w-7 h-7 text-slate-400 stroke-[1.5]" />
                </div>
                <p className="text-slate-800 text-sm font-medium">
                  {activeTab === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
                <p className="text-slate-400 text-xs mt-1 max-w-xs font-normal">
                  {activeTab === "unread"
                    ? "You have caught up with all your notifications."
                    : "When you receive notifications about likes, comments, or friends, they will appear here."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notification) => {
                const typeConfig = getNotificationTypeConfig(notification.type);
                const actorName =
                  notification.actor?.fullName ||
                  notification.data?.actorName ||
                  "Someone";
                const actorAvatar =
                  notification.actor?.profilePicUrl ||
                  notification.data?.actorProfilePicture;
                const notificationMessage =
                  notification.data?.message ||
                  notification.message ||
                  "New interaction";

                return (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full group flex items-start gap-3.5 p-3.5 hover:bg-slate-50 transition-colors duration-200 cursor-pointer relative ${
                      !notification.isRead ? "bg-slate-50/80" : "bg-white"
                    }`}
                  >
                    {/* Left: Avatar with type badge */}
                    <div className="relative shrink-0 mt-0.5">
                      {actorAvatar ? (
                        <img
                          src={actorAvatar}
                          alt={actorName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                          <User className="w-5 h-5" />
                        </div>
                      )}

                      {/* Bottom-right Corner Action Badge */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${typeConfig.badgeBg} flex items-center justify-center border-2 border-white`}
                      >
                        {typeConfig.icon}
                      </div>
                    </div>

                    {/* Middle: Text Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs sm:text-sm text-slate-800 leading-snug">
                        <span className="font-medium text-slate-900 mr-1">
                          {actorName}
                        </span>
                        <span className="font-normal text-slate-600">
                          {notificationMessage}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 font-normal">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Right: Unread Indicator & Mark-as-read Quick Action */}
                    <div className="shrink-0 flex items-center gap-1.5 self-center">
                      {!notification.isRead && (
                        <span
                          className="w-2.5 h-2.5 bg-[#4E4AFC] rounded-full transition-all duration-300 transform scale-100"
                          title="Unread"
                        />
                      )}

                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {loadingNotifications && (
            <div className="flex justify-center py-5">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-[#4E4AFC]"></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
