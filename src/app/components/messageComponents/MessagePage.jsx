"use client";

import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  ArrowLeftIcon,
  DocumentIcon,
  FaceSmileIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PauseIcon,
  PhoneIcon,
  PhoneXMarkIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  UserIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon
} from "@heroicons/react/24/outline";
import { PhoneIcon as PhoneSolidIcon } from "@heroicons/react/24/solid";
import EmojiPicker from "emoji-picker-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

// ── Web Audio API দিয়ে message send sound ──────────────────────────
const playMessageSendSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain);
    o2.connect(gain);
    gain.connect(ctx.destination);
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.setValueAtTime(600, ctx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
    o2.frequency.setValueAtTime(800, ctx.currentTime + 0.04);
    o2.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o1.start(ctx.currentTime);
    o1.stop(ctx.currentTime + 0.18);
    o2.start(ctx.currentTime + 0.04);
    o2.stop(ctx.currentTime + 0.18);
  } catch (e) {}
};

const playMessageReceiveSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.connect(gain);
    gain.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.15);
  } catch (e) {}
};
// ────────────────────────────────────────────────────────────────────

// ── Voice Message Helper Functions ─────────────────────────────────
const formatVoiceDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
// ───────────────────────────────────────────────────────────────────

const MessagePage = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("userId");

  // Voice Message States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  
  // Playing voice message states
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const audioRef = useRef(null);

  // Call states
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallConnected, setIsCallConnected] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const selectedChatRef = useRef(null);
  
  // Voice recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // selectedChat কে ref এ রাখি যাতে socket callback এ সবসময় latest value পাই
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  };

  // Auto-select chat if userId is provided in URL
useEffect(() => {
  if (initialUserId && conversations.length > 0 && !selectedChat) {
    const chat = conversations.find(c => c.friendId === initialUserId);
    if (chat) {
      handleSelectChat(chat);
    }
  }
}, [initialUserId, conversations, selectedChat]);

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let playing = true;
      const ring = () => {
        if (!playing) return;
        [0, 0.3].forEach(offset => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = "sine";
          o.frequency.value = 480;
          g.gain.setValueAtTime(0, ctx.currentTime + offset);
          g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.05);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.25);
          o.start(ctx.currentTime + offset);
          o.stop(ctx.currentTime + offset + 0.25);
        });
        setTimeout(() => { if (playing) ring(); }, 2000);
      };
      ring();
      ringtoneRef.current = { stop: () => { playing = false; ctx.close(); } };
    } catch (e) {}
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }
  };

  const fetchConversations = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/users/conversations");
      if (response.data.success) {
        setConversations(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = async (friendId) => {
    setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/users/messages/${friendId}`);
      if (response.data.success) {
        setMessages(response.data.data);
        scrollToBottom();
        if (socket) {
          socket.emit("mark_as_read", { senderId: friendId });
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const initMediaStream = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
      });
      setLocalStream(stream);
      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      toast.error("Camera/Microphone access denied. Please allow permissions.");
      return null;
    }
  };

  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(configuration);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const targetId = selectedChatRef.current?.friendId;
        if (targetId) {
          socket.emit("ice_candidate", { to: targetId, candidate: event.candidate });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
        setIsCallConnected(true);
        stopRingtone();
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }
      } else if (["disconnected", "failed"].includes(pc.connectionState)) {
        endCall();
      }
    };

    return pc;
  };

  const startCall = async (type) => {
    if (!selectedChatRef.current) return;
    
    if (isCalling || isInCall || isCallConnected) {
      toast.error("Already in a call");
      return;
    }
    
    if (!onlineUsers.includes(selectedChatRef.current.friendId)) {
      toast.error(`${selectedChatRef.current.friendName} is offline`);
      return;
    }

    setCallType(type);
    setIsCalling(true);
    setCallStatus("ringing");
    setCallDuration(0);
    setIsCallConnected(false);
    playRingtone();

    const stream = await initMediaStream(type);
    if (!stream) {
      setIsCalling(false);
      setCallStatus(null);
      stopRingtone();
      return;
    }

    const pc = createPeerConnection(stream);
    peerConnectionRef.current = pc;

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
      await pc.setLocalDescription(offer);

      socket.emit("call_user", {
        to: selectedChatRef.current.friendId,
        from: user._id,
        fromName: user.fullName,
        fromProfilePicture: user.profilePicture?.url || null,
        type,
        offer
      });
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start call");
      endCall();
    }
  };

  const answerCall = async (callData) => {
    if (!callData) return;
    
    if (isCalling || isInCall || isCallConnected) {
      socket.emit("call_busy", { to: callData.from });
      return;
    }
    
    stopRingtone();
    setCallType(callData.type);
    setIsInCall(true);
    setCallStatus("connecting");
    setIncomingCall(null);
    setCallDuration(0);
    setIsCallConnected(false);

    const stream = await initMediaStream(callData.type);
    if (!stream) {
      toast.error("Failed to access media devices");
      return;
    }

    const pc = createPeerConnection(stream);
    peerConnectionRef.current = pc;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer_call", { to: callData.from, answer });
      setCallStatus("connected");
      setIsCallConnected(true);
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Failed to answer call");
      endCall();
    }
  };

  const endCall = useCallback(() => {
    stopRingtone();
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socket && selectedChatRef.current) {
      socket.emit("end_call", { to: selectedChatRef.current.friendId });
    }
    setIsCalling(false);
    setIsInCall(false);
    setIsCallConnected(false);
    setCallType(null);
    setCallStatus(null);
    setLocalStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    setIncomingCall(null);
  }, [localStream, socket]);

  const toggleMute = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === "video") {
      const track = localStream.getVideoTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
    }
  };

  const formatCallDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  useEffect(() => {
    if (isAuthenticated) fetchConversations();
  }, [isAuthenticated, fetchConversations]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onReceiveMessage = (message) => {
      const chat = selectedChatRef.current;
      if (chat && message.senderId === chat.friendId) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
        socket.emit("mark_as_read", { senderId: message.senderId });
        playMessageReceiveSound();
      }
      fetchConversations();
    };

    const onMessageSent = (message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
      fetchConversations();
    };

    const onUserTyping = ({ userId, isTyping }) => {
      const chat = selectedChatRef.current;
      if (chat && userId === chat.friendId) {
        setTypingUser(isTyping ? userId : null);
      }
    };

    const onMessagesRead = ({ userId }) => {
      const chat = selectedChatRef.current;
      if (chat && userId === chat.friendId) fetchConversations();
    };

    const onIncomingCall = (data) => {
      if (isInCall || isCalling || isCallConnected) {
        socket.emit("call_busy", { to: data.from });
        return;
      }
      setIncomingCall(data);
      playRingtone();
    };

    const onCallAccepted = async (data) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          setIsCalling(false);
          setIsInCall(true);
          setCallStatus("connected");
          setIsCallConnected(true);
          stopRingtone();
          if (!callTimerRef.current) {
            callTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
        } catch (err) {
          console.error(err);
          endCall();
        }
      }
    };

    const onIceCandidate = async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {}
      }
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("message_sent", onMessageSent);
    socket.on("user_typing", onUserTyping);
    socket.on("messages_read", onMessagesRead);
    socket.on("incoming_call", onIncomingCall);
    socket.on("call_accepted", onCallAccepted);
    socket.on("call_rejected", () => { toast.error("Call rejected"); endCall(); });
    socket.on("call_ended", () => { endCall(); });
    socket.on("call_busy", () => { toast.error("User is on another call"); endCall(); });
    socket.on("ice_candidate", onIceCandidate);
    socket.on("call_error", (d) => { toast.error(d?.message || "Call failed"); endCall(); });

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("message_sent", onMessageSent);
      socket.off("user_typing", onUserTyping);
      socket.off("messages_read", onMessagesRead);
      socket.off("incoming_call", onIncomingCall);
      socket.off("call_accepted", onCallAccepted);
      socket.off("call_rejected");
      socket.off("call_ended");
      socket.off("call_busy");
      socket.off("ice_candidate", onIceCandidate);
      socket.off("call_error");
    };
  }, [socket, isInCall, isCalling, isCallConnected, endCall, fetchConversations]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup audio preview URL on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.friendId);
    setShowEmojiPicker(false);
    if (socket) socket.emit("join_room", chat.friendId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const message = newMessage.trim();
    setNewMessage("");
    playMessageSendSound();
    if (socket) {
      socket.emit("send_message", {
        receiverId: selectedChat.friendId,
        message,
        messageType: "text"
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB allowed"); return; }
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const type = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "document";
      if (socket) {
        socket.emit("send_message", {
          receiverId: selectedChat.friendId,
          message: "",
          messageType: type,
          mediaUrl: ev.target.result,
          fileName: file.name,
          fileSize: file.size
        });
      }
      playMessageSendSound();
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Voice Message Functions ──────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setRecordedBlob(audioBlob);
        
        // Create preview URL for playback
        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success("Recording started...");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Microphone access denied. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      toast.success("Recording stopped");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop all audio tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setRecordedBlob(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      setRecordingTime(0);
      toast.info("Recording cancelled");
    }
  };

  const sendVoiceMessage = async () => {
    if (!recordedBlob || !selectedChat) return;
    
    setUploadingFile(true);
    try {
      // Convert blob to base64 for sending via socket
      const base64Audio = await blobToBase64(recordedBlob);
      
      if (socket) {
        socket.emit("send_message", {
          receiverId: selectedChat.friendId,
          message: "",
          messageType: "voice",
          mediaUrl: base64Audio,
          fileName: `voice_${Date.now()}.webm`,
          fileSize: recordedBlob.size,
          duration: recordingTime
        });
      }
      
      playMessageSendSound();
      
      // Cleanup
      setRecordedBlob(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      setRecordingTime(0);
      
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast.error("Failed to send voice message");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleTyping = () => {
    if (!selectedChat) return;
    socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
    }, 1000);
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString();
  };

  // ── Voice Message Player Component ───────────────────────────────
  const VoiceMessagePlayer = ({ audioUrl, duration, messageId, isOwn }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const localAudioRef = useRef(null);

    useEffect(() => {
      return () => {
        if (localAudioRef.current) {
          localAudioRef.current.pause();
          localAudioRef.current.src = "";
        }
      };
    }, []);

    const togglePlay = () => {
      if (!localAudioRef.current) return;
      
      // Pause other playing messages
      if (playingMessageId && playingMessageId !== messageId) {
        const otherAudio = document.querySelector(`audio[data-message-id="${playingMessageId}"]`);
        if (otherAudio) {
          otherAudio.pause();
          otherAudio.currentTime = 0;
        }
      }
      
      if (isPlaying) {
        localAudioRef.current.pause();
        setPlayingMessageId(null);
      } else {
        localAudioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          toast.error("Failed to play voice message");
        });
        setPlayingMessageId(messageId);
      }
      setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
      if (localAudioRef.current) {
        setCurrentTime(localAudioRef.current.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (playingMessageId === messageId) {
        setPlayingMessageId(null);
      }
    };

    const handleSeek = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      if (localAudioRef.current && duration) {
        localAudioRef.current.currentTime = percent * duration;
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
        
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition ${
            isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-blue-500/20 hover:bg-blue-500/30'
          }`}
        >
          {isPlaying ? (
            <PauseIcon className="h-4 w-4 text-white" />
          ) : (
            <PlayIcon className="h-4 w-4 text-white ml-0.5" />
          )}
        </button>
        
        {/* Waveform/Progress Bar */}
        <div className="flex-1 min-w-0">
          <div 
            className={`h-8 rounded-full cursor-pointer relative overflow-hidden ${
              isOwn ? 'bg-white/20' : 'bg-blue-500/20'
            }`}
            onClick={handleSeek}
          >
            {/* Progress fill */}
            <div 
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                isOwn ? 'bg-white/40' : 'bg-blue-500/40'
              }`}
              style={{ width: `${progress}%` }}
            />
            
            {/* Waveform visualization (static) */}
            <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full ${isOwn ? 'bg-white/60' : 'bg-blue-400/60'}`}
                  style={{ 
                    height: `${Math.random() * 16 + 4}px`,
                    opacity: i / 20 < progress / 100 ? 1 : 0.4
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Duration */}
          <div className="flex justify-between mt-1">
            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/50'}`}>
              {formatVoiceDuration(currentTime)}
            </span>
            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/50'}`}>
              {formatVoiceDuration(duration || 0)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderMessageContent = (msg) => {
    if (msg.messageType === "image") {
      return (
        <Image src={msg.mediaUrl} alt="img" width={240} height={240}
          className="rounded-xl cursor-pointer max-w-[240px]"
          onClick={() => window.open(msg.mediaUrl, "_blank")} />
      );
    }
    if (msg.messageType === "video") {
      return <video src={msg.mediaUrl} controls className="rounded-xl max-w-[240px]" />;
    }
    if (msg.messageType === "document") {
      return (
        <a href={msg.mediaUrl} download={msg.fileName}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition max-w-[220px]">
          <DocumentIcon className="h-7 w-7 text-blue-300 flex-shrink-0" />
          <span className="text-sm truncate">{msg.fileName || "Document"}</span>
        </a>
      );
    }
    // ── Voice Message Rendering ─────────────────────────────────────
    if (msg.messageType === "voice") {
      return (
        <VoiceMessagePlayer 
          audioUrl={msg.mediaUrl} 
          duration={msg.duration} 
          messageId={msg._id}
          isOwn={msg.senderId === user?._id}
        />
      );
    }
    // ───────────────────────────────────────────────────────────────
    
    const text = typeof msg.message === "string" ? msg.message : String(msg.message || "");
    return <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>;
  };

  const filteredConversations = conversations.filter(c =>
    c.friendName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Auth guard ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#18191a]">
        <div className="text-center">
          <p className="text-white/70 mb-4">Please login to access messages</p>
          <Link href="/auth/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Login</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#18191a]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ── Incoming call modal ───────────────────────────────────────────
  const IncomingCallModal = () => {
    if (!incomingCall) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-[#242526] rounded-2xl p-6 w-80 shadow-2xl border border-white/10 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 ring-4 ring-green-500 animate-pulse">
            {incomingCall.fromProfilePicture ? (
              <Image src={incomingCall.fromProfilePicture} alt="" width={80} height={80} className="rounded-full object-cover" />
            ) : (
              <UserIcon className="h-10 w-10 text-white" />
            )}
          </div>
          <h3 className="text-white text-xl font-bold mb-1">{incomingCall.fromName}</h3>
          <p className="text-white/50 text-sm mb-6">
            {incomingCall.type === "video" ? "📹 Incoming video call" : "📞 Incoming audio call"}
          </p>
          <div className="flex justify-center gap-8">
            <button onClick={() => { stopRingtone(); setIncomingCall(null); socket?.emit("reject_call", { to: incomingCall.from }); }}
              className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition">
                <PhoneXMarkIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-white/60 text-xs">Decline</span>
            </button>
            <button onClick={() => answerCall(incomingCall)}
              className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition animate-bounce">
                <PhoneIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-white/60 text-xs">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Active call UI ────────────────────────────────────────────────
  if (isInCall || isCalling) {
    return (
      <>
        <IncomingCallModal />
        <div className="fixed inset-0 z-50 bg-[#1c1e21] flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden flex items-center justify-center">
                {selectedChat?.friendProfilePicture ? (
                  <Image src={selectedChat.friendProfilePicture} alt="" width={40} height={40} className="object-cover" />
                ) : (
                  <UserIcon className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <p className="text-white font-semibold">{selectedChat?.friendName}</p>
                <p className="text-white/50 text-xs">
                  {callStatus === "ringing" ? "Ringing..." :
                   callStatus === "connecting" ? "Connecting..." :
                   callStatus === "connected" ? formatCallDuration(callDuration) : "Calling..."}
                </p>
              </div>
            </div>
          </div>

          {/* Video/Audio area */}
          <div className="flex-1 relative flex items-center justify-center bg-[#0f1011]">
            {callType === "video" ? (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <video ref={localVideoRef} autoPlay playsInline muted
                  className="absolute bottom-4 right-4 w-28 h-40 rounded-xl object-cover border border-white/20 shadow-xl" />
              </>
            ) : (
              <div className="text-center">
                <div className={`w-36 h-36 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 overflow-hidden ${callStatus === "ringing" ? "ring-4 ring-green-500 animate-pulse" : ""}`}>
                  {selectedChat?.friendProfilePicture ? (
                    <Image src={selectedChat.friendProfilePicture} alt="" width={144} height={144} className="object-cover" />
                  ) : (
                    <UserIcon className="h-16 w-16 text-white" />
                  )}
                </div>
                <h3 className="text-white text-2xl font-bold mb-2">{selectedChat?.friendName}</h3>
                <p className="text-white/50">
                  {callStatus === "connected" ? formatCallDuration(callDuration) :
                   callStatus === "ringing" ? "Ringing..." : "Connecting..."}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-6 py-6 flex items-center justify-center gap-5 border-t border-white/10">
            <button onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-[#3a3b3c] hover:bg-[#4e4f50]"}`}>
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </button>
            {callType === "video" && (
              <button onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-[#3a3b3c] hover:bg-[#4e4f50]"}`}>
                {isVideoOff ? <VideoCameraSlashIcon className="h-6 w-6 text-white" /> : <VideoCameraIcon className="h-6 w-6 text-white" />}
              </button>
            )}
            <button onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg">
              <PhoneXMarkIcon className="h-7 w-7 text-white" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <IncomingCallModal />
      <div className="fixed inset-0 bg-[#18191a] pt-16 md:pt-20">
        <div className="h-full max-w-7xl mx-auto flex overflow-hidden">

          {/* ── Left sidebar ─────────────────────────────────────── */}
          <div className={`
            w-full md:w-[360px] flex-shrink-0 bg-[#242526] flex flex-col border-r border-[#3a3b3c]
            ${selectedChat ? "hidden md:flex" : "flex"}
          `}>
            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-3 border-b border-[#3a3b3c]">
              <h2 className="text-white text-2xl font-bold mb-3">Chats</h2>
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Messenger"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#3a3b3c] text-white text-sm rounded-full py-2 pl-9 pr-4 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto py-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-sm">
                  {searchQuery ? "No results found" : "No conversations yet"}
                </div>
              ) : (
                filteredConversations.map(chat => {
                  const isOnline = onlineUsers.includes(chat.friendId);
                  const isActive = selectedChat?.friendId === chat.friendId;
                  return (
                    <button key={chat.friendId} onClick={() => handleSelectChat(chat)}
                      className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-xl transition-all ${isActive ? "bg-[#3a3b3c]" : "hover:bg-[#3a3b3c]"}`}
                      style={{ width: "calc(100% - 8px)" }}>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          {chat.friendProfilePicture ? (
                            <Image src={chat.friendProfilePicture} alt={chat.friendName} width={56} height={56} className="object-cover" />
                          ) : (
                            <UserIcon className="h-7 w-7 text-white" />
                          )}
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#242526]" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline">
                          <span className={`font-semibold text-sm truncate ${chat.unreadCount > 0 ? "text-white" : "text-white/80"}`}>
                            {chat.friendName}
                          </span>
                          {chat.updatedAt && (
                            <span className="text-[11px] text-white/40 ml-2 flex-shrink-0">{formatTime(chat.updatedAt)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${chat.unreadCount > 0 ? "text-white font-medium" : "text-white/50"}`}>
                            {chat.lastMessage
                              ? (typeof chat.lastMessage === "string" ? chat.lastMessage : "New message")
                              : "Say hi! 👋"}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="ml-2 flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                              {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right: Chat area ──────────────────────────────────── */}
          {selectedChat ? (
            <div className="flex-1 flex flex-col bg-[#18191a] min-w-0">
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#242526] border-b border-[#3a3b3c] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 transition">
                    <ArrowLeftIcon className="h-5 w-5 text-white" />
                  </button>
                  <div className="relative cursor-pointer" onClick={() => {}}>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {selectedChat.friendProfilePicture ? (
                        <Image src={selectedChat.friendProfilePicture} alt={selectedChat.friendName} width={40} height={40} className="object-cover" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    {onlineUsers.includes(selectedChat.friendId) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#242526]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{selectedChat.friendName}</h3>
                    <p className="text-[11px] text-white/50">
                      {onlineUsers.includes(selectedChat.friendId) ? "Active now" : "Offline"}
                    </p>
                  </div>
                </div>
                {/* Call buttons */}
                <div className="flex items-center gap-1">
                  <button onClick={() => startCall("audio")} disabled={!onlineUsers.includes(selectedChat.friendId) || isCalling || isInCall}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition ${onlineUsers.includes(selectedChat.friendId) && !isCalling && !isInCall ? "bg-[#3a3b3c] hover:bg-[#4e4f50] text-blue-400" : "bg-[#2c2d2e] text-white/20 cursor-not-allowed"}`}
                    title="Audio call">
                    <PhoneIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => startCall("video")} disabled={!onlineUsers.includes(selectedChat.friendId) || isCalling || isInCall}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition ${onlineUsers.includes(selectedChat.friendId) && !isCalling && !isInCall ? "bg-[#3a3b3c] hover:bg-[#4e4f50] text-blue-400" : "bg-[#2c2d2e] text-white/20 cursor-not-allowed"}`}
                    title="Video call">
                    <VideoCameraIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isOwn = msg.senderId === user?._id;
                      const prevMsg = messages[idx - 1];
                      const nextMsg = messages[idx + 1];
                      const isSameAsPrev = prevMsg?.senderId === msg.senderId;
                      const isSameAsNext = nextMsg?.senderId === msg.senderId;

                      const showAvatar = !isOwn && !isSameAsNext;
                      const topRadius = isSameAsPrev ? (isOwn ? "rounded-tr-md" : "rounded-tl-md") : "";
                      const bottomRadius = isSameAsNext ? (isOwn ? "rounded-br-md" : "rounded-bl-md") : "";
                      const marginTop = isSameAsPrev ? "mt-0.5" : "mt-3";

                      return (
                        <div key={msg._id || idx} className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2 ${marginTop}`}>
                          {/* Avatar */}
                          {!isOwn && (
                            <div className="w-7 h-7 flex-shrink-0">
                              {showAvatar ? (
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                  {selectedChat.friendProfilePicture ? (
                                    <Image src={selectedChat.friendProfilePicture} alt="" width={28} height={28} className="object-cover" />
                                  ) : (
                                    <UserIcon className="h-4 w-4 text-white" />
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )}

                          <div className="flex flex-col max-w-[65%]">
                            <div className={`
                              relative group
                              ${msg.messageType === "text" ? "px-3 py-2" : "p-1"}
                              rounded-2xl
                              ${topRadius} ${bottomRadius}
                              ${isOwn
                                ? "bg-[#0084ff] text-white"
                                : "bg-[#3a3b3c] text-white"
                              }
                            `}>
                              {renderMessageContent(msg)}
                              {/* Timestamp on hover */}
                              <span className="absolute -bottom-5 right-0 text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                {formatTime(msg.createdAt)}
                                {isOwn && msg.isRead && " · Seen"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing indicator */}
                    {typingUser && (
                      <div className="flex justify-start items-end gap-2 mt-3">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          {selectedChat.friendProfilePicture ? (
                            <Image src={selectedChat.friendProfilePicture} alt="" width={28} height={28} className="object-cover" />
                          ) : (
                            <UserIcon className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="bg-[#3a3b3c] px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} className="h-6" />
                  </>
                )}
              </div>

              {/* ── Recording Preview Bar ─────────────────────────── */}
              {isRecording && (
                <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/30 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">{formatVoiceDuration(recordingTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={cancelRecording}
                      className="p-2 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white"
                      title="Cancel"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={stopRecording}
                      className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg"
                      title="Stop Recording"
                    >
                      <StopIcon className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Voice Preview Before Send ─────────────────────── */}
              {recordedBlob && !isRecording && (
                <div className="px-4 py-2 bg-[#242526] border-t border-[#3a3b3c] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <VoiceMessagePlayer 
                      audioUrl={audioPreviewUrl} 
                      duration={recordingTime} 
                      messageId="preview"
                      isOwn={true}
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button 
                      onClick={() => {
                        setRecordedBlob(null);
                        if (audioPreviewUrl) {
                          URL.revokeObjectURL(audioPreviewUrl);
                          setAudioPreviewUrl(null);
                        }
                        setRecordingTime(0);
                      }}
                      className="p-2 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white"
                      title="Cancel"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={sendVoiceMessage}
                      disabled={uploadingFile}
                      className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 flex items-center justify-center transition shadow-lg"
                      title="Send Voice Message"
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

              {/* Input bar */}
              <div className="px-4 mb-18 md:mb-0 py-3 bg-[#242526] border-t border-[#3a3b3c] flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Emoji */}
                  <div className="relative flex-shrink-0" ref={emojiPickerRef}>
                    <button type="button" onClick={() => setShowEmojiPicker(p => !p)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition">
                      <FaceSmileIcon className="h-5 w-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full mb-2 left-0 z-50">
                        <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                      </div>
                    )}
                  </div>

                  {/* File */}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition">
                    <PaperClipIcon className="h-5 w-5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*,application/pdf" onChange={handleFileUpload} className="hidden" />

                  {/* ── Voice Record Button ───────────────────────── */}
                  {!isRecording && !recordedBlob && (
                    <button 
                      type="button" 
                      onClick={startRecording}
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition"
                      title="Record voice message"
                    >
                      <MicrophoneIcon className="h-5 w-5" />
                    </button>
                  )}
                  {/* ─────────────────────────────────────────────── */}

                  {/* Text input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyUp={handleTyping}
                    placeholder="Aa"
                    className="flex-1 min-w-0 bg-[#3a3b3c] text-white text-sm rounded-full px-4 py-2.5 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ WebkitAppearance: "none", WebkitTapHighlightColor: "transparent" }}
                  />

                  {/* Send */}
                  <button type="submit" disabled={!newMessage.trim() || uploadingFile}
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-500 transition">
                    {uploadingFile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                    ) : (
                      <PaperAirplaneIcon className="h-4 w-4 text-white" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-[#18191a]">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-[#3a3b3c] flex items-center justify-center mx-auto mb-4">
                  <PhoneSolidIcon className="h-9 w-9 text-white/30" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-1">Your messages</h3>
                <p className="text-white/40 text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .animate-bounce { animation: bounce 1s infinite; }
        
        /* Fix: Audio/Video call audio fix */
        video, audio {
          pointer-events: auto;
        }
        
        /* Ensure remote video stream audio works */
        video:not([muted]) {
          audio: auto;
        }
        
        /* Custom scrollbar for voice message waveform */
        input[type="range"] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          margin-top: -4px;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
        }
      `}</style>
    </>
  );
};

export default MessagePage;