// ─────────────────────────────────────────────────────────────────────────────
// PART 4: components/messaging/VoiceMessage.jsx
// Voice recorder + VoiceMessagePlayer — fully self-contained
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { formatVoiceDuration } from "@/app/utils/messageUtils";
import { PauseIcon, PlayIcon, StopIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

// ── Static waveform bars (memoised to avoid re-render flicker) ───────────────
const BARS = Array.from({ length: 20 }, () => Math.random() * 16 + 4);

// ── VoiceMessagePlayer ───────────────────────────────────────────────────────
export const VoiceMessagePlayer = ({ audioUrl, duration, messageId, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const localAudioRef = useRef(null);

  useEffect(() => () => {
    if (localAudioRef.current) {
      localAudioRef.current.pause();
      localAudioRef.current.src = "";
    }
  }, []);

  const togglePlay = () => {
    if (!localAudioRef.current) return;
    if (isPlaying) {
      localAudioRef.current.pause();
    } else {
      localAudioRef.current.play().catch(() => {});
    }
    setIsPlaying((p) => !p);
  };

  const handleTimeUpdate = () => {
    if (localAudioRef.current) setCurrentTime(localAudioRef.current.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (localAudioRef.current && duration) {
      localAudioRef.current.currentTime = pct * duration;
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[240px]">
      <audio
        ref={localAudioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        data-message-id={messageId}
        className="hidden"
      />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
          isOwn ? "bg-white/20 hover:bg-white/30" : "bg-blue-500/20 hover:bg-blue-500/30"
        }`}
      >
        {isPlaying ? (
          <PauseIcon className="h-4 w-4 text-white" />
        ) : (
          <PlayIcon className="h-4 w-4 text-white ml-0.5" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 min-w-0">
        <div
          className={`h-8 rounded-full cursor-pointer relative overflow-hidden ${
            isOwn ? "bg-white/20" : "bg-blue-500/20"
          }`}
          onClick={handleSeek}
        >
          {/* Progress fill */}
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-75 ${
              isOwn ? "bg-white/40" : "bg-blue-500/40"
            }`}
            style={{ width: `${progress}%` }}
          />
          {/* Static bars */}
          <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
            {BARS.map((h, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full ${isOwn ? "bg-white/70" : "bg-blue-400/70"}`}
                style={{
                  height: `${h}px`,
                  opacity: i / BARS.length < progress / 100 ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex justify-between mt-1">
          <span className={`text-[10px] ${isOwn ? "text-white/70" : "text-white/50"}`}>
            {formatVoiceDuration(currentTime)}
          </span>
          <span className={`text-[10px] ${isOwn ? "text-white/70" : "text-white/50"}`}>
            {formatVoiceDuration(duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── useVoiceRecorder hook ────────────────────────────────────────────────────
export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Cleanup preview URL on unmount
  useEffect(() => () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
  }, [audioPreviewUrl]);

  const _clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const _reset = () => {
    setRecordedBlob(null);
    setAudioPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setRecordingTime(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        setRecordedBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch {
      // toast handled by caller
      throw new Error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      _clearTimer();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Prevent onstop from saving the blob
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      _clearTimer();
      _reset();
    }
  };

  const discardRecording = () => _reset();

  return {
    isRecording,
    recordingTime,
    recordedBlob,
    audioPreviewUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    discardRecording,
  };
};

// ── RecordingBar — shown while actively recording ────────────────────────────
export const RecordingBar = ({ recordingTime, onStop, onCancel }) => (
  <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/30 flex items-center justify-between flex-shrink-0">
    <div className="flex items-center gap-3">
      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
      <span className="text-white text-sm font-medium tabular-nums">
        {formatVoiceDuration(recordingTime)}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onCancel}
        className="p-2 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"
        title="Cancel"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
      <button
        onClick={onStop}
        className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg active:scale-95"
        title="Stop Recording"
      >
        <StopIcon className="h-5 w-5 text-white" />
      </button>
    </div>
  </div>
);