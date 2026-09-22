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
  CodeBracketIcon,
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
    { name: "s/Mod", href: "/", icon: ShieldCheckIcon },
  ];

  const recentCommunities = [
    { name: "s/computerscience", href: "/", icon: CodeBracketIcon },
    { name: "s/technology", href: "/", icon: CpuChipIcon },
    { name: "s/singularity", href: "/", icon: SparklesIcon },
    { name: "s/community", href: "/community", icon: UserGroupIcon },
    { name: "s/community", href: "/", icon: UserGroupIcon },
  ];

  return (
    <aside className="hidden lg:block w-[260px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-3.5 px-3 border-r border-border bg-card select-none">
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 fb-nav-item",
                isActive && "fb-nav-item-active"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted"
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
          className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-muted hover:text-foreground cursor-pointer"
        >
          <span>Moderation</span>
          <ChevronDownIcon
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-muted",
              !modOpen && "-rotate-90"
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden",
            modOpen ? "grid-rows-[1fr] opacity-100 mt-0.5" : "grid-rows-[0fr] opacity-0 pointer-events-none mt-0"
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                modOpen ? "translate-y-0" : "-translate-y-2"
              )}
            >
              {moderationNav.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 fb-nav-item",
                      isActive && "fb-nav-item-active"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5 transition-colors",
                        isActive ? "text-primary" : "text-muted"
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Communities Section */}
      <div className="mt-3.5">
        <button
          onClick={() => setRecentOpen(!recentOpen)}
          className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-muted hover:text-foreground cursor-pointer"
        >
          <span>Recent</span>
          <ChevronDownIcon
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-muted",
              !recentOpen && "-rotate-90"
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden",
            recentOpen ? "grid-rows-[1fr] opacity-100 mt-0.5" : "grid-rows-[0fr] opacity-0 pointer-events-none mt-0"
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                recentOpen ? "translate-y-0" : "-translate-y-2"
              )}
            >
              {recentCommunities.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium fb-nav-item"
                  >
                    <Icon className="h-4.5 w-4.5 transition-colors text-muted" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Quick Link */}
      {isAuthenticated && (user?.username || currentUserId) && (
        <div className="mt-5 pt-3 border-t border-border">
          <Link
            href={`/s/${user?.username || currentUserId}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium fb-nav-item"
          >
            <UserCircleIcon className="h-5 w-5 text-muted" />
            <span>My Profile</span>
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
