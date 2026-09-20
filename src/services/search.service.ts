import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse, IUser, IPost } from "@/interfaces";

export const searchUsers = async (query: string, limit = 10): Promise<IUser[]> => {
  try {
    if (!query || query.trim().length === 0) return [];
    const response = await apiClient.get<ApiResponse<IUser[]>>(
      `/users/search/${encodeURIComponent(query.trim())}`,
      {
        params: { limit },
      }
    );
    return response.data?.data || [];
  } catch (error) {
    return handleApiError(error);
  }
};

export const searchPosts = async (query: string, limit = 10): Promise<IPost[]> => {
  try {
    if (!query || query.trim().length === 0) return [];
    const response = await apiClient.get<ApiResponse<IPost[]>>(
      `/posts/search/${encodeURIComponent(query.trim())}`,
      {
        params: { limit },
      }
    );
    return response.data?.data || [];
  } catch (error) {
    return handleApiError(error);
  }
};

export const searchService = {
  searchUsers,
  searchPosts,
};

export default searchService;

