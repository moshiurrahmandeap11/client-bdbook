export type Role = "USER" | "ADMIN" | "user" | "admin";

export interface IUser {
  id: string;
  _id?: string;
  username: string;
  name: string;
  fullName: string;
  email: string;
  role: Role;
  gender?: "male" | "female" | "other" | null;
  dob?: string | Date | null;
  avatar?: string | null;
  profilePicUrl?: string | null;
  profilePicOptimizedUrl?: string | null;
  profilePicture?: {
    url?: string;
    publicId?: string;
    optimizedUrl?: string;
  } | string | null;
  coverImage?: string | null;
  coverPhotoUrl?: string | null;
  coverPhotoOptimizedUrl?: string | null;
  coverPhoto?: {
    url?: string;
    publicId?: string;
    optimizedUrl?: string;
  } | string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts?: number;
    friends?: number;
  };
}

export interface UpdateUserPayload {
  username?: string;
  name?: string;
  fullName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar?: string;
  coverImage?: string;
  gender?: "male" | "female" | "other";
  dob?: string;
}

