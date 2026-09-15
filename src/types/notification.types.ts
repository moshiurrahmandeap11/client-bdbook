import { IUser } from "./user.types";

export type NotificationType = "LIKE" | "COMMENT" | "FRIEND_REQUEST" | "FRIEND_ACCEPT" | "SYSTEM";

export interface INotification {
  id: string;
  _id?: string;
  userId: string;
  senderId?: string;
  sender?: IUser;
  type: NotificationType;
  message: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

