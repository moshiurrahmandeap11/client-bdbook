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
        </svg>

        {/* SVG Connection Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1="50%"
            y1="50%"
            x2="22%"
            y2="28%"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <line
            x1="50%"
            y1="50%"
            x2="78%"
            y2="25%"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <line
            x1="50%"
            y1="50%"
            x2="20%"
            y2="75%"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <line
            x1="50%"
            y1="50%"
            x2="80%"
            y2="75%"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Central Brand Hub Node */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-16 h-16 rounded-2xl bg-[#4E4AFC] text-white flex items-center justify-center">
            <span className="text-2xl font-normal tracking-tight">S</span>
            {/* Ping Ring Effect */}
            <span className="absolute -inset-1.5 rounded-2xl border-2 border-[#4E4AFC]/30 animate-ping opacity-30" />
          </div>
          <span className="mt-2 text-xs font-normal text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200/70">
            Stalk Network
          </span>
        </div>

        {/* Floating Card 1: Top-Left (Friend Connected) */}
        <div className="absolute top-6 left-6 sm:top-8 sm:left-10 z-20 bg-white border border-slate-200 rounded-md px-3 py-2 flex items-center gap-2.5 animate-float-slow">
          <div className="relative">
            <Avatar name="Alex Johnson" size={28} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-normal text-slate-900 leading-tight">Sarah joined</p>
            <p className="text-[10px] text-slate-400 font-normal">s/technology</p>
          </div>
        </div>

        {/* Floating Card 2: Top-Right (Heart / Reaction Badge) */}
        <div className="absolute top-6 right-6 sm:top-7 sm:right-10 z-20 bg-white border border-slate-200 rounded-md px-3 py-2 flex items-center gap-2 animate-float-delayed">
          <div className="w-7 h-7 rounded-md bg-red-50 text-red-500 flex items-center justify-center">
            <HeartIcon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-normal text-slate-900 leading-tight">Liked a post</p>
            <p className="text-[10px] text-slate-400 font-normal">Just now</p>
          </div>
        </div>

        {/* Floating Card 3: Bottom-Left (Chat Message Bubble) */}
        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 z-20 bg-white border border-slate-200 rounded-md px-3 py-2 flex items-center gap-2 animate-float-delayed">
// [wip step 5/6]
