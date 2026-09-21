import { apiClient, handleApiError } from "./api";

export interface IFollowStatusResponse {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export const followUser = async (userId: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/follow/${userId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const unfollowUser = async (userId: string): Promise<any> => {
  try {
    const response = await apiClient.delete(`/follow/${userId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getFollowStatus = async (userId: string): Promise<IFollowStatusResponse> => {
  try {
    const response = await apiClient.get(`/follow/status/${userId}`);
    return response.data.data || { isFollowing: false, isFollowedBy: false };
  } catch (error) {
    return { isFollowing: false, isFollowedBy: false };
  }
};
