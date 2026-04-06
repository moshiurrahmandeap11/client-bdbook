// components/posts/SharedPostPreview.jsx
"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { memo } from "react";
import { Avatar } from "./Avatar";

// ── Liquid Glass style ───────────────────────────────────────────
const glassInner = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "0.5px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

export const SharedPostPreview = memo(({ originalPost, postUrl, onClick, className = "" }) => {
  // ── Fallback: No original post data ────────────────────────────
  if (!originalPost) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left mt-3 rounded-xl overflow-hidden transition-all duration-200 hover:opacity-80 ${className}`}
        style={{ ...glassInner, borderRadius: 12 }}
      >
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.25)" }}>
            <LinkIcon className="h-5 w-5" style={{ color: "#a78bfa" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
              View Original Post
            </p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
              {postUrl}
            </p>
          </div>
        </div>
      </button>
    );
  }

  // ── Render: With original post data ────────────────────────────
  return (
    <button
      onClick={onClick}
      className={`w-full text-left mt-3 rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.99] ${className}`}
      style={{ ...glassInner, borderRadius: 12 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
        <Avatar src={originalPost.userProfilePicture} name={originalPost.userName} size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
            {originalPost.userName || "Unknown User"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Original post
          </p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{
          background: "rgba(124,58,237,0.25)",
          color: "#c4b5fd",
          border: "0.5px solid rgba(124,58,237,0.4)",
        }}>
          Original
        </span>
      </div>

      {/* Description */}
      {originalPost.description && (
        <p className="text-sm px-3 py-2 line-clamp-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
          {originalPost.description}
        </p>
      )}

      {/* Media */}
      {originalPost.media?.url && (
        <div className="w-full overflow-hidden" style={{ maxHeight: 280 }}>
          {originalPost.media.resourceType === "video" ? (
            <video
              src={originalPost.media.url}
              className="w-full object-cover"
              style={{ maxHeight: 280 }}
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
              controls
            />
          ) : (
            <div className="relative w-full" style={{ minHeight: 140 }}>
              <Image
                src={originalPost.media.url}
                alt="Original post media"
                width={600}
                height={300}
                className="w-full object-cover"
                style={{ maxHeight: 280 }}
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-3 py-2" style={{
        borderTop: "0.5px solid rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.35)",
      }}>
        <LinkIcon className="h-3 w-3 flex-shrink-0" />
        <span className="text-[11px]">Tap to view full post</span>
      </div>
    </button>
  );
});

SharedPostPreview.displayName = 'SharedPostPreview';
export default SharedPostPreview;