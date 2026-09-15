import { IUser } from "./user.types";

export interface IPostMedia {
  url: string;
  publicId?: string | null;
  resourceType?: string | null;
  mimeType?: string | null;
  size?: number | null;
  thumbnailUrl?: string | null;
}

export interface IComment {
  id: string;
  _id?: string;
  postId: string;
  userId: string;
  userName?: string;
  userProfilePicture?: string | null;
  user?: IUser;
  parentId?: string | null;
  text: string;
  replies?: IComment[];
  createdAt: string;
  updatedAt: string;
}

export interface IPost {
  id: string;
  _id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userProfilePicture?: string | null;
  user?: IUser;
  description?: string;
  content?: string;
  media?: IPostMedia | any;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaThumbnail?: string | null;
  originalPost?: IPost | null;
  sharedPost?: IPost | null;
  sharedPostId?: string | null;
  type?: string;
  likes?: string[];
  likesCount?: number;
  comments?: IComment[];
  commentsCount?: number;
  shares?: any[];
  sharesCount?: number;
  reposts?: string[];
  repostsCount?: number;
  isShare?: boolean;
  isRepost?: boolean;
  isLiked?: boolean;
  isLikedByCurrentUser?: boolean;
  isSaved?: boolean;
  isInterested?: boolean;
  isNotInterested?: boolean;
  isReposted?: boolean;
  _count?: {
    likes?: number;
    comments?: number;
    shares?: number;
    reposts?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostPayload {
  description?: string;
  content?: string;
  mediaUrl?: string;
  media?: string[];
}

export interface CreateCommentPayload {
  postId: string;
  text: string;
  parentId?: string;
}
