"use client";

import { cn } from "@/lib/utils";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  PauseIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import React, { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { BsVolumeDown, BsVolumeMute, BsVolumeUp } from "react-icons/bs";

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
  ambientBlur?: boolean;
  allowFitToggle?: boolean;
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
  maxHeight = 560,
  aspectRatio,
  compact = false,
  autoPlay = false,
  loop = false,
  defaultMuted = false,
  showFullscreen = true,
  objectFit = "contain",
  playsInline = true,
  ambientBlur = true,
  allowFitToggle = true,
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
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(defaultMuted);
  const prevVolumeRef = useRef(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentFit, setCurrentFit] = useState<"cover" | "contain">(
    objectFit === "cover" ? "cover" : "contain"
  );
  const [isPortrait, setIsPortrait] = useState(false);

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
    if (isMuted || volume === 0) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8;
      videoRef.current.muted = false;
      videoRef.current.volume = restored;
      setIsMuted(false);
      setVolume(restored);
    } else {
      prevVolumeRef.current = volume > 0 ? volume : 0.8;
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((newVol: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    videoRef.current.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      videoRef.current.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    if (clamped > 0) {
      prevVolumeRef.current = clamped;
    }
  }, [isMuted]);

  const handleVolumeBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleVolumeChange(pct);
  }, [handleVolumeChange]);

  const toggleFit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentFit((prev) => (prev === "contain" ? "cover" : "contain"));
  }, []);

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

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    setDuration(el.duration || 0);
    if (el.videoWidth && el.videoHeight) {
      setIsPortrait(el.videoHeight > el.videoWidth);
    }
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

  const calculatedMaxHeight = isPortrait ? Math.max(Number(maxHeight) || 560, 580) : maxHeight;

  const dynamicStyle: React.CSSProperties = {
    maxHeight: calculatedMaxHeight ?? undefined,
    aspectRatio: aspectRatio ?? undefined,
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-xl overflow-hidden bg-black group cursor-pointer select-none flex items-center justify-center",
        className
      )}
      style={dynamicStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      {/* Ambient Blurred Background to eliminate stark black side letterboxes */}
      {ambientBlur && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          {poster ? (
            <img
              src={poster}
              alt=""
              className="w-full h-full object-cover blur-2xl scale-125 opacity-40 brightness-75 transition-opacity duration-500"
            />
          ) : (
            <video
              src={src}
              className="w-full h-full object-cover blur-2xl scale-125 opacity-40 brightness-75"
              muted
              tabIndex={-1}
              playsInline
            />
          )}
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
        </div>
      )}

      {/* Main Crisp Video */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn(
          "w-full h-full relative z-10 transition-all duration-200",
          currentFit === "cover" ? "object-cover" : "object-contain"
        )}
        style={{ maxHeight: calculatedMaxHeight ?? undefined }}
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
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 transition-opacity duration-200"
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
          "absolute bottom-0 left-0 right-0 transition-opacity duration-300 z-30",
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

        {/* Control Buttons & Volume */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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

            {/* YouTube-Style Expanding Volume Control */}
            <div
              className="group/volume flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={toggleMute}
                className={cn(
                  "rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0",
                  compact ? "w-7 h-7" : "w-8 h-8"
                )}
                aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <BsVolumeMute className="h-4.5 w-4.5 opacity-70" />
                ) : volume < 0.5 ? (
                  <BsVolumeDown className="h-4.5 w-4.5" />
                ) : (
                  <BsVolumeUp className="h-4.5 w-4.5" />
                )}
              </button>

              {/* Smooth Expanding Horizontal Slider Track */}
              <div
                className={cn(
                  "w-0 opacity-0 group-hover/volume:w-16 group-hover/volume:opacity-100 group-focus-within/volume:w-16 group-focus-within/volume:opacity-100 transition-all duration-200 ease-out flex items-center h-6 cursor-pointer pl-1.5 pr-1",
                  compact && "group-hover/volume:w-14"
                )}
                onClick={handleVolumeBarClick}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const bar = e.currentTarget;
                  const onMove = (ev: MouseEvent) => {
                    const rect = bar.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                    handleVolumeChange(pct);
                  };
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
              >
                <div className="w-full h-1 bg-white/35 rounded-full relative group-hover/volume:h-1.5 transition-all">
                  <div
                    className="h-full bg-white rounded-full relative"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover/volume:opacity-100 transition-opacity shadow" />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Time / Duration */}
            <span className="text-[11px] sm:text-xs text-white/90 font-medium tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Fit / Fill (Zoom) Toggle Button */}
            {allowFitToggle && isPortrait && (
              <button
                type="button"
                onClick={toggleFit}
                className={cn(
                  "rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors cursor-pointer",
                  compact ? "w-7 h-7" : "w-8 h-8"
                )}
                aria-label={currentFit === "contain" ? "Zoom to fill" : "Fit to frame"}
                title={currentFit === "contain" ? "Zoom to fill frame" : "Fit whole video"}
              >
                {currentFit === "contain" ? (
                  <ArrowsPointingOutIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                ) : (
                  <ArrowsPointingInIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                )}
              </button>
            )}

            {/* Fullscreen Button */}
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
    </div>
  );
});

CustomVideoPlayer.displayName = "CustomVideoPlayer";
export default CustomVideoPlayer;
