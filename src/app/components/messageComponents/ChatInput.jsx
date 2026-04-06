// ─────────────────────────────────────────────────────────────────────────────
// PART 7: components/messaging/ChatInput.jsx
// Message input bar — text, emoji, file upload, voice record
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { blobToBase64, playMessageSendSound } from "@/app/utils/messageUtils";
import {
    FaceSmileIcon,
    MicrophoneIcon,
    PaperAirplaneIcon,
    PaperClipIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import EmojiPicker from "emoji-picker-react";
import { memo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RecordingBar, useVoiceRecorder, VoiceMessagePlayer } from "./VoiceMessage";

export const ChatInput = memo(
  ({ selectedChat, socket, onFileSend, uploadingFile, setUploadingFile }) => {
    const [newMessage, setNewMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const voice = useVoiceRecorder();

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSend = (e) => {
      e.preventDefault();
      if (!newMessage.trim() || !selectedChat) return;
      playMessageSendSound();
      socket?.emit("send_message", {
        receiverId: selectedChat.friendId,
        message: newMessage.trim(),
        messageType: "text",
      });
      setNewMessage("");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
    };

    const handleTyping = () => {
      if (!selectedChat) return;
      socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
      }, 1000);
    };

    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB allowed"); return; }
      setUploadingFile(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const type = file.type.startsWith("image")
          ? "image"
          : file.type.startsWith("video")
          ? "video"
          : "document";
        socket?.emit("send_message", {
          receiverId: selectedChat.friendId,
          message: "",
          messageType: type,
          mediaUrl: ev.target.result,
          fileName: file.name,
          fileSize: file.size,
        });
        playMessageSendSound();
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSendVoice = async () => {
      if (!voice.recordedBlob || !selectedChat) return;
      setUploadingFile(true);
      try {
        const base64Audio = await blobToBase64(voice.recordedBlob);
        socket?.emit("send_message", {
          receiverId: selectedChat.friendId,
          message: "",
          messageType: "voice",
          mediaUrl: base64Audio,
          fileName: `voice_${Date.now()}.webm`,
          fileSize: voice.recordedBlob.size,
          duration: voice.recordingTime,
        });
        playMessageSendSound();
        voice.discardRecording();
      } catch {
        toast.error("Failed to send voice message");
      } finally {
        setUploadingFile(false);
      }
    };

    const handleStartRecording = async () => {
      try {
        await voice.startRecording();
        toast.success("Recording started...");
      } catch {
        toast.error("Microphone access denied. Please allow permissions.");
      }
    };

    const onEmojiClick = (emojiObject) => {
      setNewMessage((p) => p + emojiObject.emoji);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    };

    return (
      <>
        {/* Recording bar */}
        {voice.isRecording && (
          <RecordingBar
            recordingTime={voice.recordingTime}
            onStop={voice.stopRecording}
            onCancel={voice.cancelRecording}
          />
        )}

        {/* Voice preview before send */}
        {voice.recordedBlob && !voice.isRecording && (
          <div className="px-4 py-2 bg-[#242526] border-t border-[#3a3b3c] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <VoiceMessagePlayer
                audioUrl={voice.audioPreviewUrl}
                duration={voice.recordingTime}
                messageId="preview"
                isOwn
              />
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={voice.discardRecording}
                className="p-2 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleSendVoice}
                disabled={uploadingFile}
                className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 flex items-center justify-center transition shadow-lg active:scale-95"
              >
                {uploadingFile ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main input bar */}
        <div className="px-4 mb-18 md:mb-0 py-3 bg-[#242526] border-t border-[#3a3b3c] flex-shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {/* Emoji picker */}
            <div className="relative flex-shrink-0" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((p) => !p)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition"
              >
                <FaceSmileIcon className="h-5 w-5" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                </div>
              )}
            </div>

            {/* File upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition"
            >
              <PaperClipIcon className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Voice record button */}
            {!voice.isRecording && !voice.recordedBlob && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition"
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button>
            )}

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyUp={handleTyping}
              placeholder="Aa"
              className="flex-1 min-w-0 bg-[#3a3b3c] text-white text-sm rounded-full px-4 py-2.5 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              style={{ WebkitAppearance: "none", WebkitTapHighlightColor: "transparent" }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!newMessage.trim() || uploadingFile}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition active:scale-95"
            >
              {uploadingFile ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
              ) : (
                <PaperAirplaneIcon className="h-4 w-4 text-white" />
              )}
            </button>
          </form>
        </div>
      </>
    );
  }
);
ChatInput.displayName = "ChatInput";