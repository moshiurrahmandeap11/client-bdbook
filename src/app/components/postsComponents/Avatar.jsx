// components/posts/Avatar.jsx
"use client";

import { UserIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { memo } from "react";

export const Avatar = memo(({ src, name, size = 40 }) => (
  <div
    className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-transform duration-200"
    style={{
      width: size, height: size,
      background: src ? "transparent" : "linear-gradient(135deg,#7c3aed,#2563eb)",
      border: "1.5px solid rgba(255,255,255,0.2)",
    }}
  >
    {src ? (
      <Image 
        src={src} 
        alt={name || ""} 
        width={size} 
        height={size} 
        className="object-cover w-full h-full"
        loading="lazy"
      />
    ) : (
      <UserIcon style={{ width: size * 0.5, height: size * 0.5, color: "#fff" }} />
    )}
  </div>
));

Avatar.displayName = 'Avatar';
export default Avatar;