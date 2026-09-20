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
      <Image 
        src={src} 
        alt={name || "User Avatar"} 
        width={size} 
        height={size} 
        className="object-cover w-full h-full"
        loading="lazy"
      />
    ) : (
      <UserIcon 
        className="text-slate-500" 
        style={{ width: size * 0.8, height: size * 0.8, marginBottom: -size * 0.05 }} 
      />
    )}
  </div>
));

Avatar.displayName = 'Avatar';
export default Avatar;


