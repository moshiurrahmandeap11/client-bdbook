"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // ✅ token না থাকলেও connect করো (guest support)
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969",
      {
        auth: { token: token || null }, // token না থাকলে null পাঠাও
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    newSocket.on("user_online", (users) => {
      setOnlineUsers(users);
    });

    newSocket.on("user_offline", (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]); // token change হলে reconnect

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};