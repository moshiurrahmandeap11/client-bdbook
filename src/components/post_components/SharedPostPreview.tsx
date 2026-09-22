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
        <div
          onClick={onClick}
          className={`w-full text-left transition-all duration-200 fb-card-inset hover:bg-canvas/50 cursor-pointer overflow-hidden ${className}`}
        >
          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-light text-primary">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                View Original Post
              </p>
              {postUrl && (
                <p className="text-xs text-muted truncate mt-0.5">
                  {postUrl}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    const mediaUrl = originalPost.mediaUrl || originalPost.media?.url;
    const mediaType = originalPost.mediaType || originalPost.media?.resourceType || "image";

    return (
      <div
        onClick={onClick}
        className={`w-full text-left transition-all duration-200 fb-card-inset hover:border-border cursor-pointer overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 pt-2.5 pb-2 border-b border-border bg-card">
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
            size={30}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight truncate">
              {originalPost.userName || originalPost.user?.fullName || "Unknown User"}
            </p>
            <p className="text-[11px] text-muted">
              Original post
            </p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 bg-primary-light text-primary border border-primary/20">
            Original
          </span>
        </div>

        {/* Description */}
        {originalPost.description && (
          <p className="text-sm px-3.5 py-2.5 line-clamp-3 leading-relaxed text-foreground">
            {originalPost.description}
          </p>
        )}

        {/* Media */}
        {mediaUrl && (
          <div className="w-full overflow-hidden bg-slate-950 flex items-center justify-center">
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                className="w-full max-h-[480px] object-contain bg-black"
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
                controls
              />
            ) : (
              <div className="relative w-full flex items-center justify-center bg-slate-950">
                <Image
                  src={mediaUrl}
                  alt="Original post media"
                  width={900}
                  height={500}
                  className="w-full object-contain max-h-[480px]"
                  loading="lazy"
                  unoptimized
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 text-muted bg-canvas/70 border-t border-border">
          <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs font-normal">Tap to view full post</span>
        </div>
      </div>
    );
  }
);

SharedPostPreview.displayName = "SharedPostPreview";
export default SharedPostPreview;
