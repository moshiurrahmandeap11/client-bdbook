"use client";

import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import {
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  PresentationChartLineIcon,
  SignalIcon,
  UserGroupIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import {
  ClipboardDocumentIcon
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const RoomPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("id");

  const [localStream, setLocalStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [previewStream, setPreviewStream] = useState(null);
  const [pinnedParticipant, setPinnedParticipant] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);

  const localVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const timerRef = useRef(null);
  const isJoiningRef = useRef(false);

  // Optimized WebRTC Configuration
  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    sdpSemantics: 'unified-plan'
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Initialize local media stream with better quality
  const initLocalStream = async (video = true, audio = true) => {
    try {
      const constraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } : false,
        video: video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        await audioContextRef.current.close();
      }
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Unable to access camera/microphone. Please check permissions.");
      return null;
    }
  };

  const startPreview = async () => {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
      const stream = await initLocalStream(isCameraOn, isMicOn);
      if (stream && previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        setPreviewStream(stream);
      }
    } catch (error) {
      console.error("Preview error:", error);
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop());
      setPreviewStream(null);
    }
  };

  const createRoom = async () => {
    setJoinName(user?.fullName || "Guest");
    setShowJoinModal(true);
  };

  const handleCreateRoom = async () => {
    if (!joinName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsCreatingRoom(true);
    stopPreview();
    setShowJoinModal(false);

    try {
      const stream = await initLocalStream(isCameraOn, isMicOn);
      if (!stream) {
        setIsCreatingRoom(false);
        toast.error("Could not access camera/microphone");
        return;
      }

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const newRoomId = generateRoomId();
      const newRoomName = `${joinName}'s Meeting`;

      socket.emit("create_room", {
        roomId: newRoomId,
        roomName: newRoomName,
        userId: user?._id || joinName,
        userName: joinName,
        userProfilePicture: user?.profilePicture?.url || null,
      });

      setRoomName(newRoomName);
      setMeetingStarted(true);
      router.push(`/room?id=${newRoomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
      setIsCreatingRoom(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!joinName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    if (isJoiningRef.current) return;
    
    isJoiningRef.current = true;
    setIsJoining(true);
    stopPreview();
    setShowJoinModal(false);
    setIsConnecting(true);

    try {
      const stream = await initLocalStream(isCameraOn, isMicOn);
      if (!stream) {
        setIsJoining(false);
        setIsConnecting(false);
        isJoiningRef.current = false;
        toast.error("Could not access camera/microphone");
        setShowJoinModal(true);
        return;
      }

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit("join_room", {
        roomId: roomId,
        userId: user?._id || joinName,
        userName: joinName,
        userProfilePicture: user?.profilePicture?.url || null,
      });
      
      // Timeout for join
      setTimeout(() => {
        if (isJoiningRef.current && !roomJoined) {
          console.log("Join timeout");
          toast.error("Failed to join room. Please try again.");
          setIsJoining(false);
          setIsConnecting(false);
          isJoiningRef.current = false;
          setShowJoinModal(true);
        }
      }, 15000);
      
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Failed to join room");
      setIsJoining(false);
      setIsConnecting(false);
      isJoiningRef.current = false;
      setShowJoinModal(true);
    }
  };

  // Create peer connection for a participant
const createPeerConnection = useCallback((participantId, stream) => {
  const pc = new RTCPeerConnection(configuration);

  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  pc.ontrack = (event) => {
    console.log(`✅ Received remote stream from ${participantId}`);
    setParticipants(prev =>
      prev.map(p =>
        p.id === participantId
          ? { ...p, stream: event.streams[0], connected: true }
          : p
      )
    );
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice_candidate", {
        roomId,
        to: participantId,
        candidate: event.candidate,
      });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`Connection state ${participantId}:`, pc.connectionState);
    if (pc.connectionState === "connected") {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, connected: true } : p));
    } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
      removeParticipant(participantId);
    }
  };

  peerConnectionsRef.current[participantId] = pc;
  return pc;
}, [roomId, socket]);

  const removeParticipant = (participantId) => {
    if (peerConnectionsRef.current[participantId]) {
      peerConnectionsRef.current[participantId].close();
      delete peerConnectionsRef.current[participantId];
    }
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  // Handle incoming offer
  const handleOffer = useCallback(async (data) => {
    if (!localStream) return;
    
    console.log("Received offer from:", data.from);
    
    let pc = peerConnectionsRef.current[data.from];
    if (!pc) {
      pc = createPeerConnection(data.from, localStream);
    }
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit("answer", {
        roomId: roomId,
        to: data.from,
        answer: answer
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }, [localStream, roomId, socket, createPeerConnection]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (data) => {
    console.log("Received answer from:", data.from);
    const pc = peerConnectionsRef.current[data.from];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (data) => {
    const pc = peerConnectionsRef.current[data.from];
    if (pc && data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  }, []);

  // Handle new participant
const handleNewParticipant = useCallback(async (data) => {
  console.log("🆕 New participant:", data.userId);

  setParticipants(prev => {
    if (prev.some(p => p.id === data.userId)) return prev;
    return [...prev, {
      id: data.userId,
      name: data.userName,
      profilePicture: data.userProfilePicture,
      stream: null,
      connected: false,
    }];
  });

  // ছোট delay দিয়ে localStream নিশ্চিত করুন
  setTimeout(async () => {
    if (!localStream) return;

    const pc = createPeerConnection(data.userId, localStream);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);

      socket.emit("offer", {
        roomId,
        to: data.userId,
        offer,
      });
      console.log(`📤 Offer sent to ${data.userId}`);
    } catch (err) {
      console.error("Offer creation failed:", err);
    }
  }, 300);
}, [localStream, roomId, socket, createPeerConnection]);

  const handleParticipantLeft = useCallback((data) => {
    console.log("Participant left:", data.userId);
    removeParticipant(data.userId);
    toast(`${data.userName} left the meeting`, { icon: "👋" });
  }, []);

  const handleRoomMessage = useCallback((data) => {
    setMessages(prev => [...prev, { ...data, timestamp: new Date() }]);
    if (!showChat) setUnreadCount(prev => prev + 1);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [showChat]);

  const handleRoomError = useCallback((data) => {
    console.error("Room error:", data);
    toast.error(data.message || "Room error occurred");
    router.push("/");
  }, [router]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("room_created", (data) => {
      setRoomName(data.roomName);
      setIsConnecting(false);
      setRoomJoined(true);
      isJoiningRef.current = false;
    });

    socket.on("room_joined", (data) => {
      setRoomName(data.roomName);
      setParticipants(data.participants.map(p => ({
        id: p.userId,
        name: p.userName,
        profilePicture: p.userProfilePicture,
        stream: null,
        connected: false
      })));
      setIsJoining(false);
      setIsConnecting(false);
      setMeetingStarted(true);
      setRoomJoined(true);
      isJoiningRef.current = false;
      toast.success(`Joined ${data.roomName}`);
    });

    socket.on("new_participant", handleNewParticipant);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice_candidate", handleIceCandidate);
    socket.on("participant_left", handleParticipantLeft);
    socket.on("room_message", handleRoomMessage);
    socket.on("room_error", handleRoomError);

    return () => {
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("new_participant");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice_candidate");
      socket.off("participant_left");
      socket.off("room_message");
      socket.off("room_error");
    };
  }, [socket, handleNewParticipant, handleOffer, handleAnswer, handleIceCandidate, handleParticipantLeft, handleRoomMessage, handleRoomError]);

  // Check for join modal
  useEffect(() => {
    if (roomId && !roomJoined && !isJoining && !showJoinModal && !meetingStarted) {
      setJoinName(user?.fullName || "");
      setShowJoinModal(true);
      startPreview();
    }
  }, [roomId, roomJoined, isJoining, showJoinModal, meetingStarted, user]);

  // Meeting timer
  useEffect(() => {
    if (meetingStarted) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [meetingStarted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
      if (previewStream) previewStream.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      if (socket && roomId && roomJoined) {
        socket.emit("leave_room", { roomId });
      }
      clearInterval(timerRef.current);
    };
  }, [localStream, screenStream, previewStream, socket, roomId, roomJoined]);

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
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      const screenStreamObj = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      setScreenStream(screenStreamObj);
      setIsScreenSharing(true);
      
      const screenTrack = screenStreamObj.getVideoTracks()[0];
      
      // Replace video track for all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender && screenTrack) {
          videoSender.replaceTrack(screenTrack);
        }
      });
      
      // Update local video display
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStreamObj;
      }
      
      screenTrack.onended = () => {
        stopScreenShare();
      };
      
      toast.success("Screen sharing started");
    } catch (error) {
      console.error("Error starting screen share:", error);
      toast.error("Failed to start screen sharing");
    }
  };

  // Stop screen sharing
  const stopScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        
        // Switch back to camera track
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
          }
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
      
      toast.success("Screen sharing stopped");
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    socket.emit("send_room_message", {
      roomId: roomId,
      message: newMessage.trim(),
      userId: user?._id || joinName,
      userName: user?.fullName || joinName,
      userProfilePicture: user?.profilePicture?.url || null,
    });
    
    setNewMessage("");
  };

  const leaveRoom = () => {
    if (socket && roomId && roomJoined) {
      socket.emit("leave_room", { roomId });
    }
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    router.push("/");
  };

  const copyRoomLink = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/room?id=${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      toast.success("Meeting link copied!");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const openChat = () => {
    setShowChat(true);
    setShowParticipants(false);
    setUnreadCount(0);
  };

  const getInitials = (name = "") =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getAvatarColor = (name = "") => {
    const colors = [
      "from-blue-500 to-cyan-400",
      "from-violet-500 to-purple-400",
      "from-emerald-500 to-teal-400",
      "from-rose-500 to-pink-400",
      "from-amber-500 to-orange-400",
      "from-sky-500 to-indigo-400",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  // Join Modal Component
  const JoinModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a73e820_0%,_transparent_60%)]" />
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col lg:flex-row gap-8 items-center justify-center">
        <div className="lg:w-1/2 text-center lg:text-left">
          <div className="flex items-center gap-2 mb-6 justify-center lg:justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center">
              <VideoCameraIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">Meet</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            {roomId ? "Ready to join?" : "Start a meeting"}
          </h1>
          <p className="text-[#9aa0a6] text-lg mb-6">
            {roomId ? "Set up your audio and video before joining" : "Create a new meeting and invite others"}
          </p>
          {roomId && (
            <div className="inline-flex items-center gap-2 bg-[#303134] rounded-lg px-4 py-2 text-sm text-[#9aa0a6]">
              <span className="font-mono text-[#8ab4f8]">Meeting ID: {roomId}</span>
            </div>
          )}
        </div>

        <div className="lg:w-96 w-full">
          <div className="bg-[#303134] rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative aspect-video bg-[#202124]">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold">
                    {joinName ? joinName[0].toUpperCase() : "?"}
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                <button
                  onClick={() => {
                    const newState = !isMicOn;
                    setIsMicOn(newState);
                    if (previewStream) {
                      const track = previewStream.getAudioTracks()[0];
                      if (track) track.enabled = newState;
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMicOn ? "bg-[#3c4043] hover:bg-[#4a4e52]" : "bg-red-600 hover:bg-red-700"}`}
                >
                  <MicrophoneIcon className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => {
                    const newState = !isCameraOn;
                    setIsCameraOn(newState);
                    if (previewStream) {
                      const track = previewStream.getVideoTracks()[0];
                      if (track) track.enabled = newState;
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCameraOn ? "bg-[#3c4043] hover:bg-[#4a4e52]" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {isCameraOn ? (
                    <VideoCameraIcon className="h-5 w-5 text-white" />
                  ) : (
                    <VideoCameraSlashIcon className="h-5 w-5 text-white" />
                  )}
                </button>
              </div>
            </div>
            <div className="p-5">
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && joinName.trim()) {
                    roomId ? handleJoinMeeting() : handleCreateRoom();
                  }
                }}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-transparent border border-[#5f6368] rounded-lg text-white placeholder-[#9aa0a6] focus:outline-none focus:border-[#8ab4f8] transition-colors text-sm mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopPreview();
                    setShowJoinModal(false);
                    router.push("/");
                  }}
                  className="flex-1 py-2.5 rounded-lg text-[#8ab4f8] text-sm font-medium hover:bg-[#8ab4f820] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={roomId ? handleJoinMeeting : handleCreateRoom}
                  disabled={!joinName.trim() || isCreatingRoom || isJoining}
                  className="flex-1 py-2.5 bg-[#8ab4f8] hover:bg-[#93bbf8] disabled:bg-[#8ab4f850] text-[#202124] font-semibold rounded-lg text-sm transition-colors"
                >
                  {isCreatingRoom || isJoining ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {roomId ? "Joining..." : "Creating..."}
                    </span>
                  ) : roomId ? "Join now" : "Create meeting"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!socket) {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#8ab4f8] mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#9aa0a6]">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (!roomId && !showJoinModal) {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center">
              <VideoCameraIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Video Meetings</h1>
          <p className="text-[#9aa0a6] mb-8">Connect with anyone, anywhere</p>
          <button
            onClick={createRoom}
            className="px-6 py-3 bg-[#8ab4f8] hover:bg-[#93bbf8] text-[#202124] font-semibold rounded-lg transition-colors"
          >
            New Meeting
          </button>
        </div>
      </div>
    );
  }

  if (showJoinModal) return <JoinModal />;
  if (isConnecting || isJoining) {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#8ab4f8] mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#9aa0a6]">Joining meeting...</p>
        </div>
      </div>
    );
  }

  // Meeting room UI
  const allParticipants = [
    {
      id: "local",
      name: user?.fullName || joinName || "You",
      profilePicture: user?.profilePicture?.url || null,
      isLocal: true,
      stream: localStream,
    },
    ...participants,
  ];

  const pinnedP = pinnedParticipant ? allParticipants.find(p => p.id === pinnedParticipant) : null;
  const gridParticipants = pinnedParticipant ? allParticipants.filter(p => p.id !== pinnedParticipant) : allParticipants;

  const getGridCols = (count) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  const VideoTile = ({ participant, isPinned = false, isLocal = false }) => {
    const videoRef = useRef(null);
    const hasStream = isLocal ? !!localStream : !!participant.stream;
    const isVideoDisabled = isLocal ? isVideoOff : false;
    const displayName = isLocal ? `${participant.name} (You)` : participant.name;

    useEffect(() => {
      if (!videoRef.current) return;
      const stream = isLocal ? localStream : participant.stream;
      if (stream && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }, [isLocal ? localStream : participant.stream]);

    return (
      <div
        className={`relative bg-[#3c4043] rounded-xl overflow-hidden group cursor-pointer ${isPinned ? "h-full" : "aspect-video"}`}
        onClick={() => setPinnedParticipant(pinnedParticipant === participant.id ? null : participant.id)}
      >
        {hasStream && !isVideoDisabled ? (
          <video
            ref={isLocal ? localVideoRef : videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#3c4043]">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(participant.name)} flex items-center justify-center text-white text-xl font-bold`}>
              {participant.profilePicture ? (
                <Image src={participant.profilePicture} alt={participant.name} width={64} height={64} className="rounded-full object-cover" />
              ) : (
                getInitials(participant.name)
              )}
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-md">{displayName}</span>
          {isLocal && isMuted && <span className="bg-red-600/80 text-white text-xs px-1.5 py-0.5 rounded-md">Muted</span>}
          {!hasStream && !isLocal && <span className="bg-black/60 text-[#9aa0a6] text-xs px-2 py-0.5 rounded-md">Connecting...</span>}
        </div>
        {isPinned && (
          <div className="absolute top-2 right-2 bg-[#8ab4f8]/20 border border-[#8ab4f8]/40 text-[#8ab4f8] text-xs px-2 py-0.5 rounded-md">Pinned</div>
        )}
        {isLocal && isScreenSharing && (
          <div className="absolute top-2 left-2 bg-green-600/80 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
            <PresentationChartLineIcon className="h-3 w-3" /> Sharing
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#202124] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#202124] z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center">
              <VideoCameraIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-white font-medium text-sm hidden sm:block">Meet</span>
          </div>
          <div className="h-4 w-px bg-[#5f6368]" />
          <div>
            <p className="text-white text-sm font-medium truncate max-w-[180px]">{roomName}</p>
            {meetingStarted && <p className="text-[#9aa0a6] text-xs font-mono">{formatTime(elapsed)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-[#303134] text-[#9aa0a6] text-xs px-3 py-1.5 rounded-lg">
            <SignalIcon className="h-3.5 w-3.5 text-green-400" />
            <span className="text-green-400">Connected</span>
          </div>
          <button onClick={copyRoomLink} className="flex items-center gap-1.5 bg-[#303134] hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:block">{copySuccess ? "Copied!" : "Copy link"}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden min-w-0">
          {pinnedP ? (
            <div className="flex-1 flex gap-2 min-h-0">
              <div className="flex-1 min-w-0">
                <VideoTile participant={pinnedP} isPinned isLocal={pinnedP.id === "local"} />
              </div>
              {gridParticipants.length > 0 && (
                <div className="w-44 flex flex-col gap-2 overflow-y-auto">
                  {gridParticipants.map(p => <VideoTile key={p.id} participant={p} isLocal={p.id === "local"} />)}
                </div>
              )}
            </div>
          ) : (
            <div className={`flex-1 grid ${getGridCols(allParticipants.length)} gap-2 content-center overflow-hidden`}>
              {allParticipants.map(p => <VideoTile key={p.id} participant={p} isLocal={p.id === "local"} />)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {(showChat || showParticipants) && (
          <div className="w-72 bg-[#303134] flex flex-col flex-shrink-0 border-l border-[#3c4043]">
            <div className="flex border-b border-[#3c4043]">
              <button onClick={openChat} className={`flex-1 py-3 text-xs font-semibold transition-colors ${showChat ? "text-[#8ab4f8] border-b-2 border-[#8ab4f8]" : "text-[#9aa0a6] hover:text-white"}`}>Chat</button>
              <button onClick={() => { setShowParticipants(true); setShowChat(false); }} className={`flex-1 py-3 text-xs font-semibold transition-colors ${showParticipants ? "text-[#8ab4f8] border-b-2 border-[#8ab4f8]" : "text-[#9aa0a6] hover:text-white"}`}>People ({allParticipants.length})</button>
              <button onClick={() => { setShowChat(false); setShowParticipants(false); }} className="px-3 text-[#9aa0a6] hover:text-white"><XMarkIcon className="h-4 w-4" /></button>
            </div>

            {showChat && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <ChatBubbleLeftRightIcon className="h-10 w-10 text-[#5f6368] mb-3" />
                      <p className="text-[#9aa0a6] text-sm">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.userId === (user?._id || joinName);
                      return (
                        <div key={idx} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                          <div className={`w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br ${getAvatarColor(msg.userName)} flex items-center justify-center text-white text-[10px] font-bold`}>
                            {getInitials(msg.userName)}
                          </div>
                          <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                            {!isMe && <p className="text-[#8ab4f8] text-[10px] mb-0.5 font-medium">{msg.userName}</p>}
                            <div className={`px-3 py-2 rounded-2xl text-sm break-words ${isMe ? "bg-[#8ab4f8] text-[#202124] rounded-tr-sm" : "bg-[#3c4043] text-white rounded-tl-sm"}`}>
                              {msg.message}
                            </div>
                            <p className="text-[#5f6368] text-[10px] mt-0.5">{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMessage} className="p-3 border-t border-[#3c4043]">
                  <div className="flex gap-2 items-center bg-[#3c4043] rounded-xl px-3 py-2">
                    <input ref={chatInputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a message..." className="flex-1 bg-transparent text-white placeholder-[#9aa0a6] text-sm focus:outline-none" />
                    <button type="submit" disabled={!newMessage.trim()} className="text-[#8ab4f8] disabled:text-[#5f6368]">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showParticipants && (
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <p className="text-[#9aa0a6] text-xs uppercase tracking-wider mb-3 px-2">In this call</p>
                {allParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#3c4043] transition-colors group">
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br ${getAvatarColor(p.name)} flex items-center justify-center overflow-hidden`}>
                      {p.profilePicture ? <Image src={p.profilePicture} alt={p.name} width={36} height={36} className="object-cover" /> : <span className="text-white text-xs font-bold">{getInitials(p.name)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.name}{p.id === "local" && <span className="text-[#9aa0a6] font-normal"> (You)</span>}</p>
                      {p.id !== "local" && !p.connected && <p className="text-[#9aa0a6] text-xs">Connecting...</p>}
                    </div>
                    {p.id === "local" && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={toggleMute} className={`p-1 rounded-full ${isMuted ? "text-red-400" : "text-[#9aa0a6]"}`}><MicrophoneIcon className="h-3.5 w-3.5" /></button>
                        <button onClick={toggleVideo} className={`p-1 rounded-full ${isVideoOff ? "text-red-400" : "text-[#9aa0a6]"}`}><VideoCameraIcon className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#202124] border-t border-[#3c4043]">
        <div className="w-28 hidden sm:block">{meetingStarted && <p className="text-[#9aa0a6] text-xs font-mono">{formatTime(elapsed)}</p>}</div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className={`relative flex flex-col items-center gap-0.5 w-14 h-14 rounded-full justify-center transition-all hover:scale-105 ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-[#3c4043] hover:bg-[#4a4e52]"}`}>
            <MicrophoneIcon className="h-5 w-5 text-white" />
          </button>
          <button onClick={toggleVideo} className={`flex flex-col items-center gap-0.5 w-14 h-14 rounded-full justify-center transition-all hover:scale-105 ${isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-[#3c4043] hover:bg-[#4a4e52]"}`}>
            {isVideoOff ? <VideoCameraSlashIcon className="h-5 w-5 text-white" /> : <VideoCameraIcon className="h-5 w-5 text-white" />}
          </button>
          <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} className={`flex flex-col items-center gap-0.5 w-14 h-14 rounded-full justify-center transition-all hover:scale-105 ${isScreenSharing ? "bg-[#8ab4f8] hover:bg-[#93bbf8]" : "bg-[#3c4043] hover:bg-[#4a4e52]"}`}>
            <PresentationChartLineIcon className={`h-5 w-5 ${isScreenSharing ? "text-[#202124]" : "text-white"}`} />
          </button>
          <button onClick={() => { if (showChat) setShowChat(false); else openChat(); }} className={`relative flex flex-col items-center gap-0.5 w-14 h-14 rounded-full justify-center transition-all hover:scale-105 ${showChat ? "bg-[#8ab4f8] hover:bg-[#93bbf8]" : "bg-[#3c4043] hover:bg-[#4a4e52]"}`}>
            <ChatBubbleLeftRightIcon className={`h-5 w-5 ${showChat ? "text-[#202124]" : "text-white"}`} />
            {unreadCount > 0 && !showChat && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          <button onClick={() => { if (showParticipants) setShowParticipants(false); else { setShowParticipants(true); setShowChat(false); } }} className={`flex flex-col items-center gap-0.5 w-14 h-14 rounded-full justify-center transition-all hover:scale-105 ${showParticipants ? "bg-[#8ab4f8] hover:bg-[#93bbf8]" : "bg-[#3c4043] hover:bg-[#4a4e52]"}`}>
            <UserGroupIcon className={`h-5 w-5 ${showParticipants ? "text-[#202124]" : "text-white"}`} />
          </button>
          <button onClick={leaveRoom} className="flex items-center gap-2 px-5 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all hover:scale-105">
            <PhoneXMarkIcon className="h-5 w-5" />
            <span className="hidden sm:block">Leave</span>
          </button>
        </div>
        <div className="w-28 flex justify-end">
          <button onClick={copyRoomLink} className="p-2 rounded-full bg-[#3c4043] hover:bg-[#4a4e52] text-[#9aa0a6] hover:text-white transition-colors">
            <ClipboardDocumentIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;