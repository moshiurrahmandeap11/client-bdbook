"use client";

import React from "react";
import { Mic, Video, Lock, RefreshCw, X, AlertTriangle, Settings } from "lucide-react";

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  callType?: "audio" | "video";
}

export default function PermissionGuideModal({
  isOpen,
  onClose,
  onRetry,
  callType = "video",
}: PermissionGuideModalProps) {
  if (!isOpen) return null;

  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border bg-destructive/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Permission Required
              </h3>
              <p className="text-xs text-muted">
                {isVideo ? "Camera & Microphone Access" : "Microphone Access"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-fb-btn text-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            <p className="font-semibold mb-0.5">
              মাইক্রোফোন বা ক্যামেরা পারমিশন ব্লক করা আছে!
            </p>
            <p>
              কল করার জন্য আপনার ব্রাউজারকে মাইক্রোফোন {isVideo ? "ও ক্যামেরা" : ""} ব্যবহারের অনুমতি দিতে হবে।
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              কিভাবে পারমিশন এলাউ করবেন (How to fix):
            </h4>

            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-canvas/60 dark:bg-slate-900/40 border border-border/60">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                1
              </div>
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary inline" />
                  ব্রাউজারের অ্যাড্রেস বারে লক আইকন ক্লিক করুন
                </p>
                <p className="text-muted mt-0.5">
                  স্ক্রিনের উপরে যেখানে ওয়েবসাইটের লিংক (URL) দেখা যায়, তার বাম পাশের লক 🔒 বা টিউন 🎛️ আইকনে ক্লিক করুন।
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-canvas/60 dark:bg-slate-900/40 border border-border/60">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                2
              </div>
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-primary inline" />
                  মাইক্রোফোন {isVideo ? "& ক্যামেরা" : ""} Allow (অনুমতি) করুন
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-muted">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-medium text-[11px]">
                    <Mic className="w-3 h-3" /> Mic: Allow
                  </span>
                  {isVideo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-medium text-[11px]">
                      <Video className="w-3 h-3" /> Camera: Allow
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-canvas/60 dark:bg-slate-900/40 border border-border/60">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                3
              </div>
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-primary inline" />
                  পেজ রিলোড বা Retry করুন
                </p>
                <p className="text-muted mt-0.5">
                  অনুমতি দেওয়ার পর নিচে থাকা &apos;Try Again&apos; বাটনে ক্লিক করুন অথবা পেজ রিলোড দিন।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-border bg-canvas/40 dark:bg-slate-900/20 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-full border border-border bg-fb-btn hover:bg-fb-btn-hover text-foreground transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                window.location.reload();
              }
            }}
            className="px-4 py-2 text-xs font-semibold rounded-full bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

