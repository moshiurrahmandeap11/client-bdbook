import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse } from "@/types/common.types";

export interface IFollowUser {
  id: string;
  _id: string;
  fullName: string;
  username: string | null;
  email: string;
  profilePicture?: {
    url: string | null;
  } | null;
  profilePicUrl?: string | null;
  bio?: string | null;
  followedAt?: string;
}

export const followUser = async (userId: string): Promise<{ isFollowing: boolean }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ isFollowing: boolean }>>(`/follow/follow/${userId}`);
    return response.data?.data ?? { isFollowing: true };
  } catch (error) {
    return handleApiError(error);
  }
};

export const unfollowUser = async (userId: string): Promise<{ isFollowing: boolean }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ isFollowing: boolean }>>(`/follow/unfollow/${userId}`);
    return response.data?.data ?? { isFollowing: false };
  } catch (error) {
    return handleApiError(error);
  }
};

export const getFollowStatus = async (userId: string): Promise<boolean> => {
  try {
    const response = await apiClient.get<ApiResponse<{ isFollowing: boolean }>>(`/follow/status/${userId}`);
    return response.data?.data?.isFollowing ?? false;
  } catch {
    return false;
  }
};

export const getFollowersCount = async (userId: string): Promise<number> => {
  try {
    const response = await apiClient.get<any>(`/follow/followers/count/${userId}`);
    const data = response.data;
    if (typeof data?.count === "number") return data.count;
    if (typeof data?.data?.count === "number") return data.data.count;
    if (typeof data?.data === "number") return data.data;
    return 0;
  } catch {
    return 0;
  }
};

export const getFollowingCount = async (userId: string): Promise<number> => {
  try {
    const response = await apiClient.get<any>(`/follow/following/count/${userId}`);
    const data = response.data;
    if (typeof data?.count === "number") return data.count;
    if (typeof data?.data?.count === "number") return data.data.count;
    if (typeof data?.data === "number") return data.data;
    return 0;
  } catch {
    return 0;
  }
};

export const getFollowers = async (userId: string): Promise<IFollowUser[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IFollowUser[]>>(`/follow/followers/${userId}`);
    return response.data?.data ?? [];
  } catch {
    return [];
  }
};

export const getFollowing = async (userId: string): Promise<IFollowUser[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IFollowUser[]>>(`/follow/following/${userId}`);
    return response.data?.data ?? [];
  } catch {
    return [];
  }
};

export const followService = {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowersCount,
  getFollowingCount,
  getFollowers,
  getFollowing,
};

