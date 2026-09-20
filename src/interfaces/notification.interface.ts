export type NotificationType =
  | "post_like"
  | "post_comment"
  | "post_share"
  | "post_repost"
  | "friend_request"
  | "friend_accept"
  | "message"
  | string;

export interface INotificationActor {
  id: string;
  fullName: string;
  username?: string;
  profilePicUrl?: string | null;
}

export interface INotificationItem {
  _id: string;
  id?: string;
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title?: string | null;
  message: string;
  postId?: string | null;
  commentId?: string | null;
  requestId?: string | null;
  isRead: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  actor?: INotificationActor | null;
  data?: {
    postId?: string | null;
    commentId?: string | null;
    requestId?: string | null;
    actorId?: string | null;
    actorName?: string | null;
    actorUsername?: string | null;
    actorProfilePicture?: string | null;
    message?: string;
    senderId?: string | null;
    senderUsername?: string | null;
    receiverId?: string | null;
  };
}

export interface IUnreadCountResponse {
  unreadCount: number;
}
