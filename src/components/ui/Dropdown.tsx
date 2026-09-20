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
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const containerRef = useRef<HTMLDivElement | null>(null);

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            "absolute mt-2 min-w-[12rem] p-1.5 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl z-50 animate-fadeInDown",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {items
            ? items.map((item, idx) => (
                <DropdownItem
                  key={idx}
                  {...item}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                />
              ))
            : children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

