export type Role = "USER" | "ADMIN";

export interface IUser {
  id: string;
  _id?: string;
  name: string;
  fullName?: string;
  email: string;
  role: Role;
  avatar?: string;
  profilePicture?: { url?: string } | string;
  coverImage?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts?: number;
    friends?: number;
  };
}

export interface UpdateUserPayload {
  name?: string;
  fullName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar?: string;
  coverImage?: string;
}
