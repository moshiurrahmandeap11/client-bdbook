import { IUser } from "./user.interface";

export type MessageType = "text" | "image" | "video" | "file" | "share";

export interface IMessage {
  id: string;
  _id?: string;
  conversationId?: string | null;
  senderId: string;
  receiverId: string;
  message?: string | null;
  text?: string | null;
  messageType: MessageType;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: IUser;
  receiver?: IUser;
}

export interface IConversationParticipant {
  id: string;
  _id?: string;
  conversationId: string;
  userId: string;
  unreadCount: number;
  createdAt: string;
  user: IUser;
  name?: string;
  avatar?: string;
}

export interface IConversation {
  id: string;
  _id?: string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: IConversationParticipant[];
  messages?: IMessage[];
}

export interface SendMessagePayload {
  receiverId: string;
  message?: string;
  text?: string;
  messageType?: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
}
