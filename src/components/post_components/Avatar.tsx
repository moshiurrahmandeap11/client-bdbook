"use client";

import { UserIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { memo } from "react";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
}

export const Avatar = memo(({ src, name, size = 40 }: AvatarProps) => (
  <div
    className="rounded-full overflow-hidden flex items-end justify-center flex-shrink-0 bg-slate-200 border border-slate-300/60 transition-transform duration-200"
    style={{
      width: size,
      height: size,
    }}
  >
    {src ? (
// [wip step 1/2]
