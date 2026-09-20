"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItemProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  children?: React.ReactNode;
  items?: DropdownItemProps[];
  align?: "left" | "right";
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  label,
  icon,
  onClick,
  danger = false,
  disabled = false,
  className,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-normal transition-colors text-left rounded-md select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        danger
          ? "text-red-600 hover:bg-red-50 hover:text-red-700"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        className
      )}
    >
      {icon && <span className="text-base flex-shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
};

export const DropdownDivider: React.FC = () => (
  <div className="my-1 border-t border-slate-100" />
);

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  items,
  align = "right",
  className,
// [wip step 1/2]
