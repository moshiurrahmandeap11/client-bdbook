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
    <aside className="hidden lg:block w-[260px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-3.5 px-3 border-r border-slate-200/80 bg-white select-none">
      {/* Feeds Section */}
      <div className="space-y-0.5">
        {mainNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-normal transition-all duration-150",
                isActive
                  ? "bg-slate-100 text-slate-900 font-normal"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-50"
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  isActive ? "text-slate-900" : "text-slate-500"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Moderation Section */}
      <div className="mt-3.5">
        <button
          onClick={() => setModOpen(!modOpen)}
          className="w-full flex items-center justify-between px-3 py-1 text-xs font-normal text-slate-500 hover:text-slate-700 cursor-pointer"
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
          <div className="mt-0.5 space-y-0.5">
            {moderationNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-normal transition-all duration-150",
                    isActive
                      ? "bg-slate-100 text-slate-900 font-normal"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-slate-900" : "text-slate-400"
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
      <div className="mt-3.5">
        <button
          onClick={() => setRecentOpen(!recentOpen)}
          className="w-full flex items-center justify-between px-3 py-1 text-xs font-normal text-slate-500 hover:text-slate-700 cursor-pointer"
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
          <div className="mt-0.5 space-y-0.5">
            {recentCommunities.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-normal text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                >
                  <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0", item.color)}>
                    <Icon className="h-3 w-3" />
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
        <div className="mt-5 pt-3 border-t border-slate-100">
          <Link
            href={`/profile/${currentUserId}`}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-normal text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <UserCircleIcon className="h-4.5 w-4.5 text-slate-400" />
            <span>My Profile</span>
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
