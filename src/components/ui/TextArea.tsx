"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, helperText, id, disabled, rows = 4, ...props }, ref) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-slate-700 tracking-wide"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={cn(
            "w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-400 transition-all duration-150 outline-none resize-none",
            "border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#4E4AFC] focus:ring-3 focus:ring-[#4E4AFC]/15",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/15",
            disabled && "opacity-50 cursor-not-allowed bg-slate-100",
            className
          )}
          {...props}
        />

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
export default TextArea;

