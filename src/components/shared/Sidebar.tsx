"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  HomeIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  UserGroupIcon,
  UserCircleIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  QueueListIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  SparklesIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { MessageCircle, Flame, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [modOpen, setModOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);

  // Don't show sidebar on auth pages
  if (pathname.startsWith("/auth")) {
    return null;
  }

  const mainNav = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Popular", href: "/videos", icon: Flame },
    { name: "All", href: "/videos", icon: Layers },
  ];

  const moderationNav = [
    { name: "Mod Mail", href: "/message", icon: EnvelopeIcon },
    { name: "Mod Queue", href: "/room", icon: QueueListIcon },
    { name: "s/Mod", href: "/community", icon: ShieldCheckIcon },
  ];

  const recentCommunities = [
    { name: "s/computerscience", href: "/", icon: ComputerDesktopIcon, color: "text-blue-500 bg-blue-50" },
    { name: "s/technology", href: "/", icon: CpuChipIcon, color: "text-indigo-500 bg-indigo-50" },
    { name: "s/singularity", href: "/", icon: SparklesIcon, color: "text-purple-500 bg-purple-50" },
    { name: "s/community", href: "/community", icon: UserGroupIcon, color: "text-emerald-500 bg-emerald-50" },
  ];

  return (
    <aside className="hidden lg:block w-[260px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-5 px-3 border-r border-slate-200/80 bg-white select-none">
      {/* Feeds Section */}
      <div className="space-y-1">
        {mainNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-[#EEEDFE] text-[#4E4AFC] font-semibold"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-50"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-[#4E4AFC]" : "text-slate-500"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Moderation Section */}
      <div className="mt-6">
        <button
          onClick={() => setModOpen(!modOpen)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider cursor-pointer"
        >
          <span>Moderation</span>
          <ChevronDownIcon
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 text-slate-400",
              !modOpen && "-rotate-90"
            )}
          />
        </button>

        {modOpen && (
          <div className="mt-1 space-y-1">
            {moderationNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-[#EEEDFE] text-[#4E4AFC] font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-[#4E4AFC]" : "text-slate-400"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Communities Section */}
      <div className="mt-6">
        <button
          onClick={() => setRecentOpen(!recentOpen)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider cursor-pointer"
        >
          <span>Recent</span>
          <ChevronDownIcon
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 text-slate-400",
              !recentOpen && "-rotate-90"
            )}
          />
        </button>

        {recentOpen && (
          <div className="mt-1 space-y-1">
            {recentCommunities.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                >
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", item.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile Quick Link */}
      {isAuthenticated && currentUserId && (
        <div className="mt-8 pt-4 border-t border-slate-100">
          <Link
            href={`/profile/${currentUserId}`}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <UserCircleIcon className="h-5 w-5 text-slate-400" />
            <span>My Profile</span>
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
