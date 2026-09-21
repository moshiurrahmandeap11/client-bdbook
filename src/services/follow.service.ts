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
