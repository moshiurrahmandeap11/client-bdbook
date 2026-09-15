import { IUser } from "./user.types";

export interface IMessage {
  id: string;
  _id?: string;
  conversationId: string;
  senderId: string;
  sender?: IUser;
  receiverId: string;
  receiver?: IUser;
  text: string;
  media?: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IConversation {
  id: string;
  participants: IUser[];
  lastMessage?: IMessage;
  unreadCount?: number;
  updatedAt: string;
}

export interface SendMessagePayload {
  receiverId: string;
  text: string;
  media?: string[];
}

