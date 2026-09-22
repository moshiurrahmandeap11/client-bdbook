import { IUser } from "./user.interface";

export type MessageType = "text" | "image" | "video" | "file" | "share";

export interface IMessageReaction {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  reaction: string;
  createdAt?: string;
}

export interface IMessage {
  id: string;
  _id?: string;
  conversationId?: string | null;
  senderId: string;
  senderName?: string;
  senderProfilePicture?: string | null;
  receiverId?: string | null;
  message?: string | null;
  text?: string | null;
  messageType: MessageType;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  isRead: boolean;
  isDelivered?: boolean;
  createdAt: string;
  updatedAt?: string;
  sender?: Partial<IUser>;
  receiver?: Partial<IUser>;
  tempId?: string | null;
  reactions?: IMessageReaction[];
}

export interface IConversationParticipant {
  id?: string;
  _id?: string;
  conversationId?: string;
  userId: string;
  unreadCount?: number;
  createdAt?: string;
  user?: Partial<IUser>;
  name?: string;
  avatar?: string | null;
}

export interface IConversation {
  id: string;
  _id?: string;
  friendId?: string;
  friendName?: string;
  friendProfilePicture?: string | null;
  unreadCount?: number;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
  participants?: IConversationParticipant[];
  messages?: IMessage[];
  isRequest?: boolean;
  isGroup?: boolean;
  adminId?: string | null;
}

export interface SendMessagePayload {
  receiverId: string;
  message?: string;
  text?: string;
  messageType?: MessageType;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  tempId?: string | null;
}

export interface IUploadMessageMediaResponse {
  url: string;
  type: "image" | "video" | "document";
  name: string;
  size: number;
}

export interface ICreateGroupPayload {
  name: string;
  avatar?: string | null;
  memberIds: string[];
}
