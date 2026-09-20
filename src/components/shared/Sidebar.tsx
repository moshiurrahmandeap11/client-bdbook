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
// [wip step 1/5]
