"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthProvider";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: [] });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const newSocket = io(socketUrl, {
      query: { userId: user.id || user._id },
      withCredentials: true,
    });

    newSocket.on("getOnlineUsers", (users: string[]) => {
      setOnlineUsers(users);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, user?._id]);

  return <SocketContext.Provider value={{ socket, onlineUsers }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

