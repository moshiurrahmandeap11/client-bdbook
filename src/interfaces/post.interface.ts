import { IUser } from "./user.interface";

export type MediaType = "image" | "video";

export interface IPostLike {
  id?: string;
  _id?: string;
  userId: string;
  postId: string;
  createdAt?: string;
  user?: IUser;
}

export interface IPostRepost {
  id?: string;
  _id?: string;
  userId: string;
  postId: string;
  createdAt?: string;
  user?: IUser;
}

export interface IComment {
  id: string;
  _id?: string;
  postId: string;
  userId: string;
  parentId?: string | null;
  text: string;
  createdAt: string;
  updatedAt?: string;
  user: IUser;
  replies?: IComment[];
}

export interface IPost {
  id: string;
  _id?: string;
  userId: string;
  description?: string | null;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
  mediaType?: MediaType | null;
  mediaMimeType?: string | null;
  mediaSize?: number | null;
  media?: {
    url?: string;
    resourceType?: string;
    publicId?: string;
  };
  userName?: string;
  userProfilePicture?: string;
  username?: string;
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  sharesCount?: number;
  isLikedByCurrentUser?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  sharedPost?: IPost | null;
  sharedPostId?: string | null;
  type?: string;
  isShare?: boolean;
  isRepost?: boolean;
  originalPostId?: string | null;
  originalPost?: IPost | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  user: IUser;
  likes?: any[];
  comments?: IComment[];
  reposts?: any[];
  _count?: {
    likes?: number;
    comments?: number;
    reposts?: number;
  };
}

export interface ICreatePostPayload {
  description?: string;
  media?: File;
  mediaType?: MediaType;
}

export type CreatePostPayload = ICreatePostPayload;

export interface CreateCommentPayload {
  text: string;
  postId: string;
  parentId?: string | null;
}

export interface IFeedResponse {
  data: IPost[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
