"use client";


import { useSocket } from "@/app/hooks/SocketContext";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    FaceSmileIcon,
    InformationCircleIcon,
    PaperAirplaneIcon,
    PaperClipIcon,
    PhoneIcon,
    PhotoIcon,
    UserIcon,
    VideoCameraIcon
} from "@heroicons/react/24/outline";
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
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await axiosInstance.get("/users/conversations");
      if (response.data.success) {
        setConversations(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected chat
  const fetchMessages = async (friendId) => {
    setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/users/messages/${friendId}`);
      if (response.data.success) {
        setMessages(response.data.data);
        scrollToBottom();
        
        // Mark messages as read
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("receive_message", (message) => {
      if (selectedChat && message.senderId === selectedChat.friendId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        // Mark as read
        socket.emit("mark_as_read", { senderId: message.senderId });
      }
      // Update conversation list
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

    return () => {
      socket.off("receive_message");
      socket.off("message_sent");
      socket.off("user_typing");
      socket.off("messages_read");
    };
  }, [socket, selectedChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.friendId);
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
    
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: true });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit("typing", { receiverId: selectedChat.friendId, isTyping: false });
    }, 1000);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
            <p className="text-white/60 mb-6">Please login to access messages</p>
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
            >
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="h-[calc(100vh-6rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden h-full flex">
          
          {/* Conversations Sidebar */}
          <div className="w-full sm:w-80 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Messages</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <UserIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/60">No conversations yet</p>
                  <p className="text-white/40 text-sm mt-2">
                    Add friends to start chatting
                  </p>
                </div>
              ) : (
                conversations.map((chat) => (
                  <button
                    key={chat.friendId}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 ${
                      selectedChat?.friendId === chat.friendId ? "bg-white/10" : ""
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                        {chat.friendProfilePicture ? (
                          <Image
                            src={chat.friendProfilePicture}
                            alt={chat.friendName}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
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
                        <h3 className="font-semibold text-white truncate">
                          {chat.friendName}
                        </h3>
                        {chat.lastMessage && (
                          <span className="text-xs text-white/40">
                            {formatTime(chat.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60 truncate">
                        {chat.lastMessage?.message || "No messages yet"}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
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
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden">
                      {selectedChat.friendProfilePicture ? (
                        <Image
                          src={selectedChat.friendProfilePicture}
                          alt={selectedChat.friendName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
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
                <div className="flex gap-2">
                  <button className="p-2 rounded-full hover:bg-white/10 transition">
                    <PhoneIcon className="h-5 w-5 text-white/60" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-white/10 transition">
                    <VideoCameraIcon className="h-5 w-5 text-white/60" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-white/10 transition">
                    <InformationCircleIcon className="h-5 w-5 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} items-end gap-2`}
                        >
                          {!isOwnMessage && showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {selectedChat.friendProfilePicture ? (
                                <Image
                                  src={selectedChat.friendProfilePicture}
                                  alt={selectedChat.friendName}
                                  width={32}
                                  height={32}
                                  className="object-cover"
                                />
                              ) : (
                                <UserIcon className="h-4 w-4 text-white" />
                              )}
                            </div>
                          )}
                          {!isOwnMessage && !showAvatar && <div className="w-8"></div>}
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              isOwnMessage
                                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                                : "bg-white/10 text-white"
                            }`}
                          >
                            <p className="text-sm break-words">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
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
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-white/10 transition"
                  >
                    <PaperClipIcon className="h-5 w-5 text-white/60" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-white/10 transition"
                  >
                    <PhotoIcon className="h-5 w-5 text-white/60" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-white/10 transition"
                  >
                    <FaceSmileIcon className="h-5 w-5 text-white/60" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyUp={handleTyping}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <PaperAirplaneIcon className="h-5 w-5 text-white" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
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
    </div>
  );
};

export default MessagePage;