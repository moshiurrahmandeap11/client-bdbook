"use client";

import { useEffect, useState } from "react";
import { IConversation, IMessage } from "@/types/message.types";
import { getConversations, getMessages, sendMessage } from "@/services/message.service";
import { useSocket } from "@/components/providers/SocketProvider";
import { Send, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

export default function MessagePage() {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations()
      .then((data) => setConversations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    getMessages(selectedUserId)
      .then((data) => setMessages(data))
      .catch(() => {});
  }, [selectedUserId]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: IMessage) => {
      if (msg.senderId === selectedUserId || msg.receiverId === selectedUserId) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("receive_message", handleNewMessage);
    return () => {
      socket.off("receive_message", handleNewMessage);
    };
  }, [socket, selectedUserId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !text.trim()) return;

    try {
      const msg = await sendMessage({ receiverId: selectedUserId, text });
      setMessages((prev) => [...prev, msg]);
      setText("");
      if (socket) {
        socket.emit("send_message", msg);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 h-[calc(100vh-5rem)] flex gap-4">
      {/* Conversations sidebar */}
      <div className="w-1/3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-normal text-lg">
          Messages
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? (
            <div className="p-4 text-center text-xs text-gray-500">Loading chats...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">No active conversations.</div>
          ) : (
            conversations.map((conv) => {
              const partner = conv.participants[0];
              const isSelected = selectedUserId === (partner?.id || partner?._id);
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedUserId(partner?.id || partner?._id || null)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition ${
                    isSelected ? "bg-[#EEEDFE] dark:bg-[#4E4AFC]/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#4E4AFC] text-white font-normal flex items-center justify-center overflow-hidden">
                    {partner?.avatar ? (
                      <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
                    ) : (
                      (partner?.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-normal text-sm truncate">{partner?.name || "User"}</h4>
                    <p className="text-xs text-gray-400 truncate">{conv.lastMessage?.text || "Started conversation"}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
        {selectedUserId ? (
          <>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => {
                const isMine = msg.senderId !== selectedUserId;
                return (
                  <div
                    key={msg.id || msg._id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        isMine
                          ? "bg-[#4E4AFC] text-white rounded-br-none"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="text-[10px] opacity-70 block text-right mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E4AFC]"
              />
              <button type="submit" className="p-2.5 bg-[#4E4AFC] text-white rounded-md hover:bg-[#3F3BE6] transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <MessageSquare className="h-12 w-12" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

