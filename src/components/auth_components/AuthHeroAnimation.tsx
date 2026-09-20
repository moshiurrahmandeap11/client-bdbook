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
      <div className="mb-8 text-center lg:text-left">
        <Logo size="xl" href="/" priority />
        <p className="mt-4 text-slate-600 text-lg sm:text-xl font-normal leading-relaxed max-w-md mx-auto lg:mx-0 transition-opacity duration-200">
          {currentMode === "login"
            ? "Connect with friends, share stories, and explore communities on Stalk."
            : "Join the Stalk community today. Connect and discover what's happening around you."}
        </p>
      </div>

      {/* Social Connection Animated Illustration */}
      <div className="relative w-full h-72 sm:h-80 bg-slate-50/70 border border-slate-200/80 rounded-2xl overflow-hidden flex items-center justify-center">
        {/* Subtle Dotted Grid Background */}
        <svg
          className="absolute inset-0 w-full h-full text-slate-200/60 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dotted-grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotted-grid)" />
// [wip step 2/6]
