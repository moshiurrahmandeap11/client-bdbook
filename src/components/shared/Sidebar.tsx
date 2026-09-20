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
  ];

  const recentCommunities = [
    { name: "s/computerscience", href: "/", icon: CodeBracketIcon },
    { name: "s/technology", href: "/", icon: CpuChipIcon },
    { name: "s/singularity", href: "/", icon: SparklesIcon },
    { name: "s/community", href: "/community", icon: UserGroupIcon },
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
// [wip step 2/5]
