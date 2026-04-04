"use client";

import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
  DocumentIcon,
  FaceSmileIcon,
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
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

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
  
  // Call states
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [caller, setCaller] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // WebRTC Configuration
  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  };

  // Fetch conversations
  const fetchConversations = async () => {
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
  };

  // Fetch messages
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

  // Initialize media stream
  const initMediaStream = async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Unable to access camera/microphone. Please check permissions.");
      return null;
    }
  };

  // Create peer connection
  const createPeerConnection = (stream, isCaller = true) => {
    const pc = new RTCPeerConnection(configuration);
    
    // Add local stream tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket.emit("ice_candidate", {
          to: selectedChat?.friendId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        toast.error("Connection failed");
        endCall();
      }
    };
    
    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        toast.success("Call connected");
      } else if (pc.connectionState === 'disconnected') {
        toast.error("Call disconnected");
        endCall();
      } else if (pc.connectionState === 'failed') {
        toast.error("Connection failed");
        endCall();
      }
    };
    
    return pc;
  };

  // Start call
  const startCall = async (type) => {
    if (!selectedChat) {
      toast.error("No chat selected");
      return;
    }
    
    if (!onlineUsers.includes(selectedChat.friendId)) {
      toast.error(`${selectedChat.friendName} is offline`);
      return;
    }
    
    console.log("Starting call to:", selectedChat.friendId, "Type:", type);
    
    setCallType(type);
    setIsCalling(true);
    setCallStatus('ringing');
    
    const stream = await initMediaStream(type);
    if (!stream) {
      setIsCalling(false);
      setCallStatus(null);
      return;
    }
    
    const pc = createPeerConnection(stream, true);
    peerConnectionRef.current = pc;
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log("Sending call to:", selectedChat.friendId);
      
      socket.emit("call_user", {
        to: selectedChat.friendId,
        from: user._id,
        fromName: user.fullName,
        type: type,
        offer: offer
      });
      
      toast.success(`Calling ${selectedChat.friendName}...`);
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start call");
      endCall();
    }
  };

  // Answer call
  const answerCall = async (callData) => {
    if (!callData) {
      console.error("No call data provided");
      return;
    }
    
    console.log("Answering call from:", callData.from);
    
    setCallType(callData.type);
    setIsInCall(true);
    setCallStatus('connecting');
    setIncomingCall(null);
    
    const stream = await initMediaStream(callData.type);
    if (!stream) {
      toast.error("Failed to access media devices");
      return;
    }
    
    const pc = createPeerConnection(stream, false);
    peerConnectionRef.current = pc;
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      console.log("Remote description set");
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Local description set");
      
      socket.emit("answer_call", {
        to: callData.from,
        answer: answer
      });
      
      setCallStatus('connected');
      toast.success("Call connected");
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Failed to answer call");
      endCall();
    }
  };

  // End call
  const endCall = () => {
    console.log("Ending call");
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setIsCalling(false);
    setIsInCall(false);
    setCallType(null);
    setCallStatus(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCaller(null);
    setIsMuted(false);
    setIsVideoOff(false);
    
    if (socket && selectedChat) {
      socket.emit("end_call", {
        to: selectedChat.friendId
      });
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    // Message events
    socket.on("receive_message", (message) => {
      if (selectedChat && message.senderId === selectedChat.friendId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        socket.emit("mark_as_read", { senderId: message.senderId });
      }
      fetchConversations();
    });

    socket.on("message_sent", (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      fetchConversations();
    });

    socket.on("user_typing", ({ userId, isTyping }) => {
      if (selectedChat && userId === selectedChat.friendId) {
        setTypingUser(isTyping ? userId : null);
      }
    });

    socket.on("messages_read", ({ userId }) => {
      if (selectedChat && userId === selectedChat.friendId) {
        fetchConversations();
      }
    });

    // Incoming call event
    socket.on("incoming_call", (data) => {
      console.log("📞 INCOMING CALL RECEIVED:", data);
      
      if (isInCall || isCalling) {
        socket.emit("call_busy", { to: data.from });
        return;
      }
      
      setIncomingCall(data);
      
      // Play ringtone
      const audio = new Audio();
      audio.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      audio.play().catch(e => console.log("Audio play failed:", e));
      
      toast.custom((t) => (
        <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl z-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center animate-pulse">
              {data.type === 'video' ? (
                <VideoCameraIcon className="h-6 w-6 text-white" />
              ) : (
                <PhoneIcon className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-lg">{data.fromName}</p>
              <p className="text-white/60 text-sm">
                {data.type === 'video' ? '📹 Video call' : '🎵 Audio call'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIncomingCall(null);
                  socket.emit("reject_call", { to: data.from });
                  toast.dismiss(t.id);
                  audio.pause();
                }}
                className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition transform hover:scale-110"
              >
                <PhoneXMarkIcon className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={() => {
                  answerCall(data);
                  toast.dismiss(t.id);
                  audio.pause();
                }}
                className="p-3 rounded-full bg-green-500 hover:bg-green-600 transition transform hover:scale-110"
              >
                <PhoneIcon className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      ), { duration: 30000 });
    });

    socket.on("call_accepted", async (data) => {
      console.log("✅ CALL ACCEPTED:", data);
      
      if (isCalling && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          setIsCalling(false);
          setIsInCall(true);
          setCallStatus('connected');
          toast.success("🎉 Call connected!");
        } catch (error) {
          console.error("Error setting remote description:", error);
          toast.error("Failed to establish connection");
          endCall();
        }
      }
    });

    socket.on("call_rejected", () => {
      console.log("❌ Call rejected");
      toast.error("Call rejected");
      endCall();
    });

    socket.on("call_ended", () => {
      console.log("Call ended");
      toast.info("Call ended");
      endCall();
    });

    socket.on("call_busy", () => {
      console.log("User is busy");
      toast.error("User is on another call");
      endCall();
    });

    socket.on("ice_candidate", async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    socket.on("call_error", (data) => {
      console.error("Call error:", data);
      toast.error(data.message || "Call failed");
      endCall();
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_sent");
      socket.off("user_typing");
      socket.off("messages_read");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("call_ended");
      socket.off("call_busy");
      socket.off("ice_candidate");
      socket.off("call_error");
    };
  }, [socket, selectedChat, isInCall, isCalling]);

  // Click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSelectChat = (chat) => {
    if (isInCall || isCalling) {
      endCall();
    }
    setSelectedChat(chat);
    fetchMessages(chat.friendId);
    setShowEmojiPicker(false);
    if (socket) {
      socket.emit("join_room", chat.friendId);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = newMessage.trim();
    setNewMessage("");
    
    if (socket) {
      socket.emit("send_message", {
        receiverId: selectedChat.friendId,
        message: message,
        messageType: "text"
      });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("File type not supported");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size should be less than 10MB");
      return;
    }

    setUploadingFile(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileData = {
        url: event.target.result,
        type: file.type.startsWith("image") ? "image" : 
              file.type.startsWith("video") ? "video" : "document",
        name: file.name,
        size: file.size
      };

      if (socket) {
        socket.emit("send_message", {
          receiverId: selectedChat.friendId,
          message: "",
          messageType: fileData.type,
          mediaUrl: fileData.url,
          fileName: fileData.name,
          fileSize: fileData.size
        });
      }
      
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTyping = () => {
    socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: true });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
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
    const messageDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const renderMessageContent = (msg) => {
    switch (msg.messageType) {
      case "image":
        return (
          <div className="relative max-w-xs">
            <Image
              src={msg.mediaUrl}
              alt="Shared image"
              width={300}
              height={300}
              className="rounded-lg cursor-pointer hover:opacity-90 transition"
              onClick={() => window.open(msg.mediaUrl, "_blank")}
            />
          </div>
        );
      
      case "video":
        return (
          <div className="relative max-w-xs">
            <video
              src={msg.mediaUrl}
              controls
              className="rounded-lg max-h-64"
            />
          </div>
        );
      
      case "document":
        return (
          <a
            href={msg.mediaUrl}
            download={msg.fileName}
            className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
          >
            <DocumentIcon className="h-8 w-8 text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.fileName || "Document"}</p>
              <p className="text-xs text-white/40">
                {msg.fileSize ? (msg.fileSize / 1024 / 1024).toFixed(2) : "Unknown"} MB
              </p>
            </div>
          </a>
        );
      
      default:
        const messageText = typeof msg.message === 'string' 
          ? msg.message 
          : (msg.message && typeof msg.message === 'object' ? JSON.stringify(msg.message) : String(msg.message || ''));
        return <p className="text-sm break-words">{messageText}</p>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
            <p className="text-white/60 mb-6">Please login to access messages</p>
            <Link href="/auth/login" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform">
              Login Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  // Call UI overlay
  if (isInCall || isCalling) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl">
        <div className="relative h-full flex flex-col">
          <button
            onClick={endCall}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-red-500 hover:bg-red-600 transition"
          >
            <PhoneXMarkIcon className="h-6 w-6 text-white" />
          </button>
          
          <div className="flex-1 flex items-center justify-center p-4">
            {callType === 'video' ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-2xl"
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-20 right-4 w-32 h-48 rounded-xl object-cover border-2 border-white/20 shadow-xl cursor-pointer"
                />
              </>
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <PhoneSolidIcon className="h-16 w-16 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedChat?.friendName}
                </h3>
                <p className="text-white/60 text-lg">
                  {callStatus === 'ringing' ? 'Ringing...' : 
                   callStatus === 'connecting' ? 'Connecting...' :
                   callStatus === 'connected' ? 'Connected' : 'Calling...'}
                </p>
              </div>
            )}
          </div>
          
          {/* Call Controls */}
          <div className="pb-8 flex items-center justify-center gap-6">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition transform hover:scale-110 ${
                isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </button>
            
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition transform hover:scale-110 ${
                  isVideoOff ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {isVideoOff ? (
                  <VideoCameraSlashIcon className="h-6 w-6 text-white" />
                ) : (
                  <VideoCameraIcon className="h-6 w-6 text-white" />
                )}
              </button>
            )}
            
            <button
              onClick={endCall}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition transform hover:scale-110 animate-pulse"
            >
              <PhoneXMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="h-[calc(100vh-6rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden h-full flex flex-col md:flex-row">
          
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Messages</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <UserIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/60">No conversations yet</p>
                </div>
              ) : (
                conversations.map((chat) => (
                  <button
                    key={chat.friendId}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 ${
                      selectedChat?.friendId === chat.friendId ? "bg-white/10" : ""
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                        {chat.friendProfilePicture ? (
                          <Image src={chat.friendProfilePicture} alt={chat.friendName} width={48} height={48} className="object-cover" />
                        ) : (
                          <UserIcon className="h-6 w-6 text-white" />
                        )}
                      </div>
                      {onlineUsers.includes(chat.friendId) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold text-white truncate">{chat.friendName}</h3>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60 truncate">
                        {chat.lastMessage ? (typeof chat.lastMessage === 'string' ? chat.lastMessage : "New message") : "No messages yet"}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-white">{chat.unreadCount}</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedChat ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 rounded-full hover:bg-white/10 transition"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                      {selectedChat.friendProfilePicture ? (
                        <Image src={selectedChat.friendProfilePicture} alt={selectedChat.friendName} width={40} height={40} className="object-cover" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    {onlineUsers.includes(selectedChat.friendId) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedChat.friendName}</h3>
                    <p className="text-xs text-white/40">
                      {onlineUsers.includes(selectedChat.friendId) ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => startCall('audio')}
                    className="p-2 rounded-full hover:bg-white/10 transition group"
                    disabled={!onlineUsers.includes(selectedChat.friendId)}
                  >
                    <PhoneIcon className={`h-5 w-5 transition ${onlineUsers.includes(selectedChat.friendId) ? 'text-white/60 group-hover:text-green-400' : 'text-white/20'}`} />
                  </button>
                  <button 
                    onClick={() => startCall('video')}
                    className="p-2 rounded-full hover:bg-white/10 transition group"
                    disabled={!onlineUsers.includes(selectedChat.friendId)}
                  >
                    <VideoCameraIcon className={`h-5 w-5 transition ${onlineUsers.includes(selectedChat.friendId) ? 'text-white/60 group-hover:text-purple-400' : 'text-white/20'}`} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-black/20">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isOwnMessage = msg.senderId === user?._id;
                      const showAvatar = !isOwnMessage && 
                        (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
                      
                      return (
                        <div
                          key={msg._id || idx}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} items-end gap-2 animate-fadeInUp`}
                        >
                          {!isOwnMessage && showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {selectedChat.friendProfilePicture ? (
                                <Image src={selectedChat.friendProfilePicture} alt={selectedChat.friendName} width={32} height={32} className="object-cover" />
                              ) : (
                                <UserIcon className="h-4 w-4 text-white" />
                              )}
                            </div>
                          )}
                          {!isOwnMessage && !showAvatar && <div className="w-8"></div>}
                          <div
                            className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                              isOwnMessage
                                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-sm"
                                : "bg-white/10 text-white rounded-bl-sm"
                            }`}
                          >
                            {renderMessageContent(msg)}
                            <p className="text-xs opacity-70 mt-1 text-right">
                              {formatTime(msg.createdAt)}
                              {isOwnMessage && msg.isRead && " ✓✓"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {typingUser && (
                      <div className="flex justify-start items-end gap-2">
                        <div className="w-8"></div>
                        <div className="bg-white/10 px-4 py-2 rounded-2xl">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 rounded-full hover:bg-white/10 transition"
                    >
                      <FaceSmileIcon className="h-5 w-5 text-white/60" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full mb-2 left-0 z-50">
                        <EmojiPicker onEmojiClick={onEmojiClick} />
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-white/10 transition"
                  >
                    <PaperClipIcon className="h-5 w-5 text-white/60" />
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyUp={handleTyping}
                    placeholder="Aa..."
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || uploadingFile}
                    className="p-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {uploadingFile ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <PaperAirplaneIcon className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="h-10 w-10 text-white/40" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Your Messages</h3>
                <p className="text-white/60">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.2s ease-out;
        }
        
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default MessagePage;