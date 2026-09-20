"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import {
  ChatBubbleLeftRightIcon,
  HeartIcon,
  PhotoIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Avatar from "@/components/post_components/Avatar";

interface AuthHeroAnimationProps {
  mode?: "login" | "register";
}

export const AuthHeroAnimation: React.FC<AuthHeroAnimationProps> = ({
  mode,
}) => {
  const pathname = usePathname();
  const currentMode = mode || (pathname?.includes("register") ? "register" : "login");

  return (
    <div className="w-full max-w-xl mx-auto lg:mx-0 flex flex-col justify-center py-6 select-none">
      {/* Brand Header */}
// [wip step 1/6]
