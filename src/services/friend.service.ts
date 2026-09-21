import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse } from "@/types/common.types";
import { IFriendship } from "@/types/friend.types";
import { IUser } from "@/types/user.types";

export const sendFriendRequest = async (receiverId: string): Promise<any> => {
  try {
    const response = await apiClient.post<ApiResponse<any>>(`/friends/friend-request/${receiverId}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const acceptFriendRequest = async (requestId: string): Promise<any> => {
  try {
    const response = await apiClient.post<ApiResponse<any>>(`/friends/friend-request/accept/${requestId}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  try {
    await apiClient.post<ApiResponse<null>>(`/friends/friend-request/decline/${requestId}`);
  } catch (error) {
    return handleApiError(error);
  }
};

export const unfriend = async (friendId: string): Promise<void> => {
  try {
    await apiClient.delete<ApiResponse<null>>(`/friends/friends/${friendId}`);
  } catch (error) {
    return handleApiError(error);
  }
};

export const getFriendsCount = async (userId: string): Promise<number> => {
  try {
    const response = await apiClient.get<any>(`/friends/friends/count/${userId}`);
    return response.data?.count ?? 0;
  } catch {
    return 0;
  }
};

export const getFollowersCount = async (userId: string): Promise<number> => {
  try {
    const response = await apiClient.get<any>(`/friends/followers/count/${userId}`);
    return response.data?.count ?? 0;
  } catch {
    return 0;
  }
};

export const getFollowingCount = async (userId: string): Promise<number> => {
  try {
    const response = await apiClient.get<any>(`/friends/following/count/${userId}`);
    return response.data?.count ?? 0;
  } catch {
    return 0;
  }
};

export const getFriendRequests = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get<ApiResponse<any[]>>("/friends/friend-requests");
    return response.data?.data ?? [];
  } catch {
    return [];
  }
};

export const getFriendStatus = async (userId: string): Promise<string> => {
  try {
    const response = await apiClient.get<ApiResponse<{ status: string }>>(`/friends/friend-status/${userId}`);
    return response.data?.data?.status || "none";
  } catch {
    return "none";
  }
};

export const getFriendsList = async (): Promise<IUser[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IUser[]>>("/friends");
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPendingRequests = async (): Promise<IFriendship[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IFriendship[]>>("/friends/requests/pending");
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

