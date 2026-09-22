"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthProvider";
import Cookies from "js-cookie";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  isUserOnline: (userId?: string | null) => boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  isUserOnline: () => false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const userId = user?.id || (user as any)?._id;
    if (!userId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const rawUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:6969";

    const socketUrl = rawUrl
      .replace(/\/v1\/api.*$/, "")
      .replace(/\/api\/v1.*$/, "")
      .replace(/\/api.*$/, "")
      .replace(/\/+$/, "");

    const token =
      Cookies.get("token") ||
      Cookies.get("accessToken") ||
      (typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken") || ""
        : "");

    const newSocket = io(socketUrl, {
      auth: { token },
      query: { userId },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const handleUserOnline = (data: string[] | string) => {
      if (Array.isArray(data)) {
        setOnlineUsers(data);
      } else if (typeof data === "string") {
        setOnlineUsers((prev) => (prev.includes(data) ? prev : [...prev, data]));
      }
    };

    const handleUserOffline = (offlineUserId: string) => {
      if (typeof offlineUserId === "string") {
        setOnlineUsers((prev) => prev.filter((id) => id !== offlineUserId));
      }
    };

    newSocket.on("user_online", handleUserOnline);
    newSocket.on("getOnlineUsers", handleUserOnline);
    newSocket.on("user_offline", handleUserOffline);

    setSocket(newSocket);

    return () => {
      newSocket.off("user_online", handleUserOnline);
      newSocket.off("getOnlineUsers", handleUserOnline);
      newSocket.off("user_offline", handleUserOffline);
      newSocket.disconnect();
    };
  }, [user?.id, (user as any)?._id]);

  const isUserOnline = useCallback(
    (targetUserId?: string | null) => {
      if (!targetUserId) return false;
      return onlineUsers.includes(targetUserId);
    },
    [onlineUsers]
  );

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isUserOnline }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
