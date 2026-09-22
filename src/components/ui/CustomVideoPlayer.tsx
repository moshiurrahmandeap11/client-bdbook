"use client";

import { cn } from "@/lib/utils";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/outline";
import React, { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { BsVolumeMute, BsVolumeUp } from "react-icons/bs";

export interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  style?: React.CSSProperties;
  maxHeight?: number | string;
  aspectRatio?: string;
  compact?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  defaultMuted?: boolean;
  showFullscreen?: boolean;
  objectFit?: "cover" | "contain" | "fill";
  playsInline?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const CustomVideoPlayer = memo(({
  src,
  poster,
  className = "",
  style = {},
  maxHeight = 500,
  aspectRatio,
  compact = false,
  autoPlay = false,
  loop = false,
  defaultMuted = false,
  showFullscreen = true,
  objectFit = "contain",
  playsInline = true,
  onPlay,
  onPause,
  onEnded,
}: CustomVideoPlayerProps) => {
  const playerId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(defaultMuted);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Single-player coordination: pause when another video in feed plays
  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== playerId && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      }
    };

    window.addEventListener("app:video-play", handleOtherPlay);
    return () => window.removeEventListener("app:video-play", handleOtherPlay);
  }, [playerId, onPause]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      // Broadcast that this video has started playing
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("app:video-play", { detail: { id: playerId } }));
      }
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          onPlay?.();
        })
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    }
  }, [playerId, onPlay, onPause]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(current);
    if (dur && !isNaN(dur)) {
      setProgress((current / dur) * 100);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  }, []);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    onEnded?.();
  }, [onEnded]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = percent * duration;
    setProgress(percent * 100);
  }, [duration]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [isPlaying]);

  const handleMouseEnter = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 800);
    }
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, []);

  const glassVideoControls: React.CSSProperties = {
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  };

  const dynamicStyle: React.CSSProperties = {
    maxHeight: maxHeight ?? undefined,
    aspectRatio: aspectRatio ?? undefined,
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-xl overflow-hidden bg-black group cursor-pointer select-none",
        className
      )}
      style={dynamicStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn(
          "w-full h-full",
          objectFit === "cover" && "object-cover",
          objectFit === "contain" && "object-contain",
          objectFit === "fill" && "object-fill"
        )}
        style={{ maxHeight: maxHeight ?? undefined }}
        autoPlay={autoPlay}
        loop={loop}
        muted={defaultMuted}
        playsInline={playsInline}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        preload="metadata"
      />

      {/* Central Play Overlay Button when Paused */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        >
          <div
            className={cn(
              "rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:scale-110 hover:bg-white/30 transition-all cursor-pointer shadow-lg",
              compact ? "w-12 h-12" : "w-16 h-16"
            )}
          >
            <PlayIcon className={cn("text-white ml-0.5", compact ? "h-6 w-6" : "h-8 w-8")} />
          </div>
        </div>
      )}

      {/* Bottom Glass Controls Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 transition-opacity duration-300 z-10",
          compact ? "px-3 pb-2 pt-6" : "px-4 pb-3 pt-8",
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={glassVideoControls}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seekbar / Progress Track */}
        <div
          className="h-1.5 bg-white/30 hover:h-2 rounded-full cursor-pointer mb-2.5 group/progress relative transition-all"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full relative transition-all duration-100"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 shadow-md transition-opacity transform translate-x-1/2" />
          </div>
        </div>

        {/* Control Buttons & Timestamp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className={cn(
                "rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors cursor-pointer",
                compact ? "w-7 h-7" : "w-8 h-8"
              )}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <PauseIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
              ) : (
                <PlayIcon className={cn("ml-0.5", compact ? "h-4 w-4" : "h-5 w-5")} />
              )}
            </button>

            {/* Mute/Unmute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className={cn(
                "rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors cursor-pointer",
                compact ? "w-7 h-7" : "w-8 h-8"
              )}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <BsVolumeMute className="h-4.5 w-4.5 opacity-60" />
              ) : (
                <BsVolumeUp className="h-4.5 w-4.5" />
              )}
            </button>

            {/* Current Time / Duration */}
            <span className="text-[11px] sm:text-xs text-white/90 font-medium tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Action: Fullscreen */}
          {showFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className={cn(
                "rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors cursor-pointer",
                compact ? "w-7 h-7" : "w-8 h-8"
              )}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <svg
                className={compact ? "h-4 w-4" : "h-4.5 w-4.5"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isFullscreen ? (
                  <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                ) : (
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

CustomVideoPlayer.displayName = "CustomVideoPlayer";
export default CustomVideoPlayer;

