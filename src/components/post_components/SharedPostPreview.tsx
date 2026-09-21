"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { memo } from "react";
import Avatar from "./Avatar";
import { IPost } from "@/types/post.types";

interface SharedPostPreviewProps {
  originalPost?: IPost | null;
  postUrl?: string;
  onClick?: () => void;
  className?: string;
}

export const SharedPostPreview = memo(
  ({ originalPost, postUrl, onClick, className = "" }: SharedPostPreviewProps) => {
    if (!originalPost) {
      return (
        <button
          onClick={onClick}
          className={`w-full text-left mt-3 rounded-xl overflow-hidden transition-all duration-200 bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#EEEDFE] text-[#4E4AFC]">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-normal text-slate-900">
                View Original Post
              </p>
              {postUrl && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {postUrl}
                </p>
              )}
            </div>
          </div>
        </button>
      );
    }

    const mediaUrl = originalPost.mediaUrl || originalPost.media?.url;
    const mediaType = originalPost.mediaType || originalPost.media?.resourceType || "image";

    return (
      <button
        onClick={onClick}
        className={`w-full text-left mt-3 rounded-xl overflow-hidden transition-all duration-200 bg-slate-50 border border-slate-200/80 hover:border-slate-300 cursor-pointer ${className}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5 border-b border-slate-200/60 bg-white/60">
          <Avatar
            src={
              originalPost.userProfilePicture ||
              (typeof originalPost.user?.profilePicture === "object"
                ? originalPost.user?.profilePicture?.url
                : originalPost.user?.profilePicture || originalPost.user?.avatar)
            }
            name={
              originalPost.userName ||
              originalPost.user?.fullName ||
              originalPost.user?.name
            }
            size={32}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-normal text-slate-900 leading-tight truncate">
              {originalPost.userName || originalPost.user?.fullName || "Unknown User"}
            </p>
            <p className="text-[11px] text-slate-500">
              Original post
            </p>
          </div>
          <span className="text-[11px] font-normal px-2 py-0.5 rounded-full flex-shrink-0 bg-[#EEEDFE] text-[#4E4AFC] border border-[#4E4AFC]/20">
            Original
          </span>
        </div>

        {/* Description */}
        {originalPost.description && (
          <p className="text-sm px-3.5 py-2.5 line-clamp-3 leading-relaxed text-slate-800">
            {originalPost.description}
          </p>
        )}

        {/* Media */}
        {mediaUrl && (
          <div className="w-full overflow-hidden bg-slate-100 border-y border-slate-200/60" style={{ maxHeight: 280 }}>
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                className="w-full object-cover"
                style={{ maxHeight: 280 }}
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
                controls
              />
            ) : (
              <div className="relative w-full" style={{ minHeight: 140 }}>
                <Image
                  src={mediaUrl}
                  alt="Original post media"
                  width={600}
                  height={300}
                  className="w-full object-cover"
                  style={{ maxHeight: 280 }}
                  loading="lazy"
                  unoptimized
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 text-slate-500 bg-white/40">
          <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs font-normal">Tap to view full post</span>
        </div>
      </button>
    );
  }
);

SharedPostPreview.displayName = "SharedPostPreview";
export default SharedPostPreview;
