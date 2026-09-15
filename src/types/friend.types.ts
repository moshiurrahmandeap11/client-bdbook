import { IUser } from "./user.types";

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";

export interface IFriendship {
  id: string;
  senderId: string;
  sender?: IUser;
  receiverId: string;
  receiver?: IUser;
  user?: IUser;
  friend?: IUser;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

