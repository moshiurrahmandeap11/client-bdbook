"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  width?: number;
  height?: number;
  className?: string;
  href?: string;
  onClick?: () => void;
  priority?: boolean;
}

const sizeMap = {
  sm: { height: 26, width: 90 },
  md: { height: 32, width: 111 },
  lg: { height: 38, width: 132 },
  xl: { height: 46, width: 160 },
};

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  width,
  height,
  className,
  href = "/",
  onClick,
  priority = true,
}) => {
  const resolvedWidth = width || sizeMap[size].width;
  const resolvedHeight = height || sizeMap[size].height;

  const content = (
    <div
      className={cn(
        "inline-flex items-center select-none cursor-pointer",
        className
      )}
    >
      <Image
        src="/stalk.svg"
        alt="Stalk"
        width={resolvedWidth}
        height={resolvedHeight}
        priority={priority}
        className="h-auto w-auto object-contain"
        style={{
          height: `${resolvedHeight}px`,
          width: "auto",
          maxWidth: "100%",
        }}
      />
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center border-none bg-transparent p-0 cursor-pointer focus:outline-none"
      >
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;

