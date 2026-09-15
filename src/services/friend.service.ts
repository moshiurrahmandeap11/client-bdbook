import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse } from "@/types/common.types";
import { IFriendship } from "@/types/friend.types";
import { IUser } from "@/types/user.types";

export const sendFriendRequest = async (receiverId: string): Promise<IFriendship> => {
  try {
    const response = await apiClient.post<ApiResponse<IFriendship>>("/friends/request", { receiverId });
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const acceptFriendRequest = async (requestId: string): Promise<IFriendship> => {
  try {
    const response = await apiClient.patch<ApiResponse<IFriendship>>(`/friends/request/${requestId}/accept`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  try {
    await apiClient.patch<ApiResponse<null>>(`/friends/request/${requestId}/reject`);
  } catch (error) {
    return handleApiError(error);
  }
};

export const unfriend = async (friendId: string): Promise<void> => {
  try {
    await apiClient.delete<ApiResponse<null>>(`/friends/${friendId}`);
  } catch (error) {
    return handleApiError(error);
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

