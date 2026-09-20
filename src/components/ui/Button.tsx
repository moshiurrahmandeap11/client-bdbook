"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white transition-colors",
  secondary:
    "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors",
  outline:
    "border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50 transition-colors",
  ghost:
    "text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors",
  danger:
    "bg-red-600 hover:bg-red-700 text-white transition-colors",
  glass:
    "bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-800 hover:bg-white transition-colors",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  xs: "px-3 py-1 text-xs font-normal rounded-md gap-1.5",
  sm: "px-3.5 py-1.5 text-xs font-normal rounded-md gap-1.5",
  md: "px-4 py-2 text-sm font-normal rounded-md gap-2",
  lg: "px-5 py-2.5 text-sm font-normal rounded-md gap-2.5",
// [wip step 1/3]
