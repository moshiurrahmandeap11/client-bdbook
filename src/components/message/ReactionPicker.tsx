"use client";

import React from "react";

export const AVAILABLE_REACTIONS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "😆", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
  { emoji: "👍", label: "Like" },
];

interface ReactionPickerProps {
  currentReaction?: string | null;
  onSelect: (emoji: string) => void;
  position?: "top-left" | "top-right";
}

export default function ReactionPicker({
  currentReaction,
  onSelect,
  position = "top-right",
}: ReactionPickerProps) {
  return (
    <div
      className={`absolute z-30 -top-11 ${
        position === "top-right" ? "right-0" : "left-0"
      } bg-card border border-border shadow-xl rounded-full px-2 py-1 flex items-center gap-1 animate-in fade-in zoom-in-90 duration-150 backdrop-blur-md`}
    >
      {AVAILABLE_REACTIONS.map((item) => {
        const isSelected = currentReaction === item.emoji;
        return (
          <button
            key={item.emoji}
            type="button"
            title={item.label}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.emoji);
            }}
            className={`text-xl sm:text-2xl p-1 rounded-full transition-transform duration-150 hover:scale-135 active:scale-95 cursor-pointer select-none ${
              isSelected ? "bg-primary/20 scale-110" : "hover:bg-fb-btn"
            }`}
          >
            {item.emoji}
          </button>
        );
      })}
    </div>
  );
}

