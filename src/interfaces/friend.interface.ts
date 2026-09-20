import { IUser } from "./user.interface";

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface IFriendRequest {
  id: string;
  _id?: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
  sender?: IUser;
  receiver?: IUser;
}

export interface IFriendship {
  id: string;
  _id?: string;
  userId: string;
  friendId: string;
  createdAt: string;
  friend: IUser;
}

