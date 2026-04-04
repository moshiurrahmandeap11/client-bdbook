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
  PhoneIcon,
  PhoneXMarkIcon,
  UserIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon
} from "@heroicons/react/24/outline";
import { PhoneIcon as PhoneSolidIcon } from "@heroicons/react/24/solid";
import EmojiPicker from "emoji-picker-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const playMessageSendSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain); o2.connect(gain); gain.connect(ctx.destination);
    o1.type = "sine"; o2.type = "sine";
    o1.frequency.setValueAtTime(600, ctx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
    o2.frequency.setValueAtTime(800, ctx.currentTime + 0.04);
    o2.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.18);
    o2.start(ctx.currentTime + 0.04); o2.stop(ctx.currentTime + 0.18);
  } catch (e) {}
};

const playMessageReceiveSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.connect(gain); gain.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.15);
  } catch (e) {}
};

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

  // Call states
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null); // ← audio-only call এর জন্য আলাদা audio element
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null); // ← stale closure এড়াতে ref
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const selectedChatRef = useRef(null);
  const callTypeRef = useRef(null); // ← callType ref
  const isCallingRef = useRef(false);
  const isInCallRef = useRef(false);

  // Sync refs
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { isCallingRef.current = isCalling; }, [isCalling]);
  useEffect(() => { isInCallRef.current = isInCall; }, [isInCall]);

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
    ]
  };

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
          o.type = "sine"; o.frequency.value = 480;
          g.gain.setValueAtTime(0, ctx.currentTime + offset);
          g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.05);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.25);
          o.start(ctx.currentTime + offset);
          o.stop(ctx.currentTime + offset + 0.25);
        });
        setTimeout(() => { if (playing) ring(); }, 2000);
      };
      ring();
      ringtoneRef.current = { stop: () => { playing = false; try { ctx.close(); } catch(e){} } };
    } catch (e) {}
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
  };

  // ── endCall: ref ব্যবহার করে, stale closure নেই ────────────────
  const endCall = useCallback(() => {
    stopRingtone();
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }

    // localStreamRef দিয়ে track বন্ধ করা — state এর উপর নির্ভর নয়
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remote audio/video clear
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    if (socket && selectedChatRef.current) {
      socket.emit("end_call", { to: selectedChatRef.current.friendId });
    }

    // State reset
    setIsCalling(false);
    setIsInCall(false);
    setCallType(null);
    setCallStatus(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    setIncomingCall(null);
  }, [socket]); // localStream state dep নেই — ref ব্যবহার করছি

  const startCallTimer = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/users/conversations");
      if (res.data.success) setConversations(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = async (friendId) => {
    setLoadingMessages(true);
    try {
      const res = await axiosInstance.get(`/users/messages/${friendId}`);
      if (res.data.success) {
        setMessages(res.data.data);
        scrollToBottom();
        socket?.emit("mark_as_read", { senderId: friendId });
      }
    } catch (e) { toast.error("Failed to load messages"); }
    finally { setLoadingMessages(false); }
  };

  const initMediaStream = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
      });
      localStreamRef.current = stream; // ← state নয়, ref এ রাখি
      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      toast.error("Camera/Microphone access denied. Please allow permissions.");
      return null;
    }
  };

  const createPeerConnection = (stream, targetId) => {
    const pc = new RTCPeerConnection(configuration);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const type = callTypeRef.current;
      if (type === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      // ← Audio track সবসময় remoteAudioRef এ attach করো
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice_candidate", { to: targetId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
        stopRingtone();
        startCallTimer();
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
    };

    return pc;
  };

  const startCall = async (type) => {
    const chat = selectedChatRef.current;
    if (!chat) return;
    if (!onlineUsers.includes(chat.friendId)) {
      toast.error(`${chat.friendName} is offline`); return;
    }
    if (isCallingRef.current || isInCallRef.current) {
      toast.error("Already in a call"); return;
    }

    setCallType(type);
    setIsCalling(true);
    setCallStatus("ringing");
    setCallDuration(0);
    playRingtone();

    const stream = await initMediaStream(type);
    if (!stream) { setIsCalling(false); setCallStatus(null); stopRingtone(); return; }

    const pc = createPeerConnection(stream, chat.friendId);
    peerConnectionRef.current = pc;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video"
      });
      await pc.setLocalDescription(offer);
      socket.emit("call_user", {
        to: chat.friendId,
        from: user._id,
        fromName: user.fullName,
        fromProfilePicture: user.profilePicture?.url || null,
        type,
        offer
      });
    } catch (err) {
      console.error("startCall error:", err);
      toast.error("Failed to start call");
      endCall();
    }
  };

  const answerCall = async (callData) => {
    if (!callData) return;
    stopRingtone();
    setCallType(callData.type);
    setIsInCall(true);
    setCallStatus("connecting");
    setIncomingCall(null);

    const stream = await initMediaStream(callData.type);
    if (!stream) { toast.error("Failed to access media devices"); return; }

    const pc = createPeerConnection(stream, callData.from);
    peerConnectionRef.current = pc;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer_call", { to: callData.from, answer });
      setCallStatus("connected");
      startCallTimer();
    } catch (err) {
      console.error("answerCall error:", err);
      toast.error("Failed to answer call");
      endCall();
    }
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const track = stream.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream && callTypeRef.current === "video") {
      const track = stream.getVideoTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
    }
  };

  const formatCallDuration = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (isAuthenticated) fetchConversations();
  }, [isAuthenticated, fetchConversations]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onReceiveMessage = (message) => {
      const chat = selectedChatRef.current;
      if (chat && message.senderId === chat.friendId) {
        setMessages(prev => prev.some(m => m._id === message._id) ? prev : [...prev, message]);
        scrollToBottom();
        socket.emit("mark_as_read", { senderId: message.senderId });
        playMessageReceiveSound();
      }
      fetchConversations();
    };

    const onMessageSent = (message) => {
      setMessages(prev => prev.some(m => m._id === message._id) ? prev : [...prev, message]);
      scrollToBottom();
      fetchConversations();
    };

    const onUserTyping = ({ userId, isTyping }) => {
      const chat = selectedChatRef.current;
      if (chat && userId === chat.friendId) setTypingUser(isTyping ? userId : null);
    };

    const onMessagesRead = ({ userId }) => {
      if (selectedChatRef.current?.friendId === userId) fetchConversations();
    };

    const onIncomingCall = (data) => {
      if (isInCallRef.current || isCallingRef.current) {
        socket.emit("call_busy", { to: data.from }); return;
      }
      setIncomingCall(data);
      playRingtone();
    };

    const onCallAccepted = async (data) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        setIsCalling(false);
        setIsInCall(true);
        setCallStatus("connected");
        stopRingtone();
        startCallTimer();
      } catch (err) {
        console.error("onCallAccepted error:", err);
        endCall();
      }
    };

    const onIceCandidate = async (data) => {
      const pc = peerConnectionRef.current;
      if (pc && data.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
      }
    };

    const onCallRejected = () => { toast.error("Call rejected"); endCall(); };
    const onCallEnded = () => { endCall(); };
    const onCallBusy = () => { toast.error("User is on another call"); endCall(); };
    const onCallError = (d) => { toast.error(d?.message || "Call failed"); endCall(); };

    socket.on("receive_message", onReceiveMessage);
    socket.on("message_sent", onMessageSent);
    socket.on("user_typing", onUserTyping);
    socket.on("messages_read", onMessagesRead);
    socket.on("incoming_call", onIncomingCall);
    socket.on("call_accepted", onCallAccepted);
    socket.on("call_rejected", onCallRejected);
    socket.on("call_ended", onCallEnded);
    socket.on("call_busy", onCallBusy);
    socket.on("ice_candidate", onIceCandidate);
    socket.on("call_error", onCallError);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("message_sent", onMessageSent);
      socket.off("user_typing", onUserTyping);
      socket.off("messages_read", onMessagesRead);
      socket.off("incoming_call", onIncomingCall);
      socket.off("call_accepted", onCallAccepted);
      socket.off("call_rejected", onCallRejected);
      socket.off("call_ended", onCallEnded);
      socket.off("call_busy", onCallBusy);
      socket.off("ice_candidate", onIceCandidate);
      socket.off("call_error", onCallError);
    };
  }, [socket, endCall, fetchConversations]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target))
        setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToBottom = () =>
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.friendId);
    setShowEmojiPicker(false);
    socket?.emit("join_room", chat.friendId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const msg = newMessage.trim();
    setNewMessage("");
    playMessageSendSound();
    socket?.emit("send_message", { receiverId: selectedChat.friendId, message: msg, messageType: "text" });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB allowed"); return; }
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const type = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "document";
      socket?.emit("send_message", {
        receiverId: selectedChat.friendId, message: "", messageType: type,
        mediaUrl: ev.target.result, fileName: file.name, fileSize: file.size
      });
      playMessageSendSound();
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTyping = () => {
    if (!selectedChat) return;
    socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
    }, 1000);
  };

  const onEmojiClick = (obj) => {
    setNewMessage(prev => prev + obj.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const formatTime = (date) => {
    const d = new Date(date), now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString();
  };

  const renderMessageContent = (msg) => {
    if (msg.messageType === "image")
      return <Image src={msg.mediaUrl} alt="img" width={240} height={240}
        className="rounded-xl cursor-pointer max-w-[240px]"
        onClick={() => window.open(msg.mediaUrl, "_blank")} />;
    if (msg.messageType === "video")
      return <video src={msg.mediaUrl} controls className="rounded-xl max-w-[240px]" />;
    if (msg.messageType === "document")
      return (
        <a href={msg.mediaUrl} download={msg.fileName}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition max-w-[220px]">
          <DocumentIcon className="h-7 w-7 text-blue-300 flex-shrink-0" />
          <span className="text-sm truncate">{msg.fileName || "Document"}</span>
        </a>
      );
    const text = typeof msg.message === "string" ? msg.message : String(msg.message || "");
    return <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>;
  };

  const filteredConversations = conversations.filter(c =>
    c.friendName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // ── Incoming call modal ───────────────────────────────────────────
  const IncomingCallModal = () => {
    if (!incomingCall) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-[#242526] rounded-2xl p-6 w-80 shadow-2xl border border-white/10 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 ring-4 ring-green-500 animate-pulse overflow-hidden">
            {incomingCall.fromProfilePicture
              ? <Image src={incomingCall.fromProfilePicture} alt="" width={80} height={80} className="object-cover rounded-full" />
              : <UserIcon className="h-10 w-10 text-white" />}
          </div>
          <h3 className="text-white text-xl font-bold mb-1">{incomingCall.fromName}</h3>
          <p className="text-white/50 text-sm mb-6">
            {incomingCall.type === "video" ? "📹 Incoming video call" : "📞 Incoming audio call"}
          </p>
          <div className="flex justify-center gap-10">
            <button onClick={() => { stopRingtone(); setIncomingCall(null); socket?.emit("reject_call", { to: incomingCall.from }); }}
              className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition">
                <PhoneXMarkIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-white/60 text-xs">Decline</span>
            </button>
            <button onClick={() => answerCall(incomingCall)} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition">
                <PhoneIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-white/60 text-xs">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Active call screen ────────────────────────────────────────────
  if (isInCall || isCalling) {
    return (
      <>
        {/* ← audio-only call এর জন্য hidden audio element — সবসময় render করো */}
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
        <IncomingCallModal />
        <div className="fixed inset-0 z-[100] bg-[#1c1e21] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden flex items-center justify-center">
              {selectedChat?.friendProfilePicture
                ? <Image src={selectedChat.friendProfilePicture} alt="" width={40} height={40} className="object-cover" />
                : <UserIcon className="h-5 w-5 text-white" />}
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

          {/* Video / Audio area */}
          <div className="flex-1 relative flex items-center justify-center bg-[#0f1011]">
            {callType === "video" ? (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <video ref={localVideoRef} autoPlay playsInline muted
                  className="absolute bottom-4 right-4 w-28 h-40 rounded-xl object-cover border border-white/20 shadow-xl" />
              </>
            ) : (
              <div className="text-center">
                <div className={`w-36 h-36 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-6 overflow-hidden flex items-center justify-center
                  ${callStatus === "ringing" ? "ring-4 ring-green-500 animate-pulse" : ""}`}>
                  {selectedChat?.friendProfilePicture
                    ? <Image src={selectedChat.friendProfilePicture} alt="" width={144} height={144} className="object-cover" />
                    : <UserIcon className="h-16 w-16 text-white" />}
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
              className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isMuted ? "bg-red-500" : "bg-[#3a3b3c] hover:bg-[#4e4f50]"}`}>
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </button>
            {callType === "video" && (
              <button onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isVideoOff ? "bg-red-500" : "bg-[#3a3b3c] hover:bg-[#4e4f50]"}`}>
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

  // ── Main chat UI ──────────────────────────────────────────────────
  return (
    <>
      {/* audio element সবসময় DOM এ থাকে — call screen ছাড়াও */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
      <IncomingCallModal />

      {/*
        Mobile keyboard fix:
        fixed inset-0 এর বদলে min-h-screen + flex column ব্যবহার করো
        যাতে keyboard উঠলে layout push করে, hide না করে
      */}
      <div className="fixed inset-0 bg-[#18191a] flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex-1 flex overflow-hidden" style={{ paddingTop: "64px" }}>
          {/* max-w wrapper */}
          <div className="w-full max-w-7xl mx-auto flex overflow-hidden h-full">

            {/* ── Sidebar ────────────────────────────────────────── */}
            <div className={`
              flex-shrink-0 bg-[#242526] flex flex-col border-r border-[#3a3b3c]
              w-full md:w-[360px]
              ${selectedChat ? "hidden md:flex" : "flex"}
            `}>
              <div className="px-4 pt-4 pb-3 border-b border-[#3a3b3c]">
                <h2 className="text-white text-2xl font-bold mb-3">Chats</h2>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#3a3b3c] text-white text-sm rounded-full py-2 pl-9 pr-4 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12 text-white/40 text-sm">
                    {searchQuery ? "No results" : "No conversations yet"}
                  </div>
                ) : filteredConversations.map(chat => {
                  const isOnline = onlineUsers.includes(chat.friendId);
                  const isActive = selectedChat?.friendId === chat.friendId;
                  return (
                    <button key={chat.friendId} onClick={() => handleSelectChat(chat)}
                      className={`w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${isActive ? "bg-[#3a3b3c]" : "hover:bg-[#3a3b3c]"}`}>
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          {chat.friendProfilePicture
                            ? <Image src={chat.friendProfilePicture} alt={chat.friendName} width={56} height={56} className="object-cover" />
                            : <UserIcon className="h-7 w-7 text-white" />}
                        </div>
                        {isOnline && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#242526]" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline">
                          <span className={`font-semibold text-sm truncate ${chat.unreadCount > 0 ? "text-white" : "text-white/80"}`}>
                            {chat.friendName}
                          </span>
                          {chat.updatedAt && <span className="text-[11px] text-white/40 ml-2 flex-shrink-0">{formatTime(chat.updatedAt)}</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${chat.unreadCount > 0 ? "text-white font-medium" : "text-white/50"}`}>
                            {chat.lastMessage ? (typeof chat.lastMessage === "string" ? chat.lastMessage : "New message") : "Say hi! 👋"}
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
                })}
              </div>
            </div>

            {/* ── Chat area ──────────────────────────────────────── */}
            {selectedChat ? (
              /*
                Mobile keyboard fix কী:
                flex flex-col + overflow-hidden দিলে browser keyboard উঠলে
                পুরো container shrink করে — input bar নিচে থাকে সবসময়
              */
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#242526] border-b border-[#3a3b3c] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 transition">
                      <ArrowLeftIcon className="h-5 w-5 text-white" />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        {selectedChat.friendProfilePicture
                          ? <Image src={selectedChat.friendProfilePicture} alt={selectedChat.friendName} width={40} height={40} className="object-cover" />
                          : <UserIcon className="h-5 w-5 text-white" />}
                      </div>
                      {onlineUsers.includes(selectedChat.friendId) &&
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#242526]" />}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{selectedChat.friendName}</h3>
                      <p className="text-[11px] text-white/50">
                        {onlineUsers.includes(selectedChat.friendId) ? "Active now" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startCall("audio")} disabled={!onlineUsers.includes(selectedChat.friendId)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition ${onlineUsers.includes(selectedChat.friendId) ? "bg-[#3a3b3c] hover:bg-[#4e4f50] text-blue-400" : "bg-[#2c2d2e] text-white/20 cursor-not-allowed"}`}>
                      <PhoneIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => startCall("video")} disabled={!onlineUsers.includes(selectedChat.friendId)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition ${onlineUsers.includes(selectedChat.friendId) ? "bg-[#3a3b3c] hover:bg-[#4e4f50] text-blue-400" : "bg-[#2c2d2e] text-white/20 cursor-not-allowed"}`}>
                      <VideoCameraIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Messages — flex-1 + overflow-y-auto */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
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
                        const marginTop = isSameAsPrev ? "mt-0.5" : "mt-3";
                        const topR = isSameAsPrev ? (isOwn ? "rounded-tr-[6px]" : "rounded-tl-[6px]") : "";
                        const botR = isSameAsNext ? (isOwn ? "rounded-br-[6px]" : "rounded-bl-[6px]") : "";

                        return (
                          <div key={msg._id || idx} className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2 ${marginTop}`}>
                            {!isOwn && (
                              <div className="w-7 h-7 flex-shrink-0">
                                {showAvatar && (
                                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    {selectedChat.friendProfilePicture
                                      ? <Image src={selectedChat.friendProfilePicture} alt="" width={28} height={28} className="object-cover" />
                                      : <UserIcon className="h-4 w-4 text-white" />}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col max-w-[70%] sm:max-w-[65%]">
                              <div className={`
                                relative group
                                ${msg.messageType === "text" ? "px-3 py-2" : "p-1"}
                                rounded-2xl ${topR} ${botR}
                                ${isOwn ? "bg-[#0084ff] text-white" : "bg-[#3a3b3c] text-white"}
                              `}>
                                {renderMessageContent(msg)}
                                <span className="absolute -bottom-5 right-0 text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  {formatTime(msg.createdAt)}{isOwn && msg.isRead ? " · Seen" : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {typingUser && (
                        <div className="flex justify-start items-end gap-2 mt-3">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            {selectedChat.friendProfilePicture
                              ? <Image src={selectedChat.friendProfilePicture} alt="" width={28} height={28} className="object-cover" />
                              : <UserIcon className="h-4 w-4 text-white" />}
                          </div>
                          <div className="bg-[#3a3b3c] px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                            {[0, 150, 300].map(d => (
                              <span key={d} className="w-2 h-2 bg-white/60 rounded-full"
                                style={{ animation: `typingBounce 1s ${d}ms infinite` }} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} className="h-6" />
                    </>
                  )}
                </div>

                {/* Input bar — flex-shrink-0 ensures it stays visible when keyboard opens */}
                <div className="flex-shrink-0 px-3 py-2 bg-[#242526] border-t border-[#3a3b3c]"
                  style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
                  <div className="flex items-center gap-1.5">
                    {/* Emoji */}
                    <div className="relative" ref={emojiPickerRef}>
                      <button type="button" onClick={() => setShowEmojiPicker(p => !p)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition flex-shrink-0">
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
                      className="w-9 h-9 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#3a3b3c] transition flex-shrink-0">
                      <PaperClipIcon className="h-5 w-5" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*,application/pdf" onChange={handleFileUpload} className="hidden" />

                    {/* Text */}
                    <input ref={inputRef} type="text" value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyUp={handleTyping}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      placeholder="Aa"
                      className="flex-1 min-w-0 bg-[#3a3b3c] text-white text-sm rounded-full px-4 py-2.5 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500" />

                    {/* Send */}
                    <button type="button" onClick={handleSendMessage} disabled={!newMessage.trim() || uploadingFile}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition flex-shrink-0">
                      {uploadingFile
                        ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                        : <PaperAirplaneIcon className="h-4 w-4 text-white" />}
                    </button>
                  </div>
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
      </div>

      <style jsx global>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
};

export default MessagePage;