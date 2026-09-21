import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse, QueryParams, IUser, UpdateUserPayload } from "@/interfaces";

export const getAllUsers = async (params?: QueryParams): Promise<ApiResponse<IUser[]>> => {
  try {
    const response = await apiClient.get<ApiResponse<IUser[]>>("/users", { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getUserById = async (id: string): Promise<IUser> => {
  try {
    const response = await apiClient.get<ApiResponse<IUser>>(`/users/${id}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getUserByUsername = async (username: string): Promise<IUser> => {
  try {
    const response = await apiClient.get<ApiResponse<IUser>>(
      `/users/username/${encodeURIComponent(username)}`
    );
    return response.data.data;
  } catch (error) {
    try {
      const fallback = await apiClient.get<ApiResponse<IUser>>(
        `/users/${encodeURIComponent(username)}`
      );
      return fallback.data.data;
    } catch {
      return handleApiError(error);
    }
  }
};

export const updateProfile = async (id: string, payload: UpdateUserPayload): Promise<IUser> => {
  try {
    const response = await apiClient.patch<ApiResponse<IUser>>(`/users/${id}`, payload);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const uploadProfilePicture = async (formData: FormData): Promise<{ url: string }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      "/users/upload-profile-pic",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const uploadCoverPhoto = async (formData: FormData): Promise<{ url: string }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      "/users/upload-cover-photo",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const removeProfilePicture = async (): Promise<void> => {
  try {
    await apiClient.delete<ApiResponse<null>>("/users/remove-profile-pic");
  } catch (error) {
    return handleApiError(error);
  }
};

export const removeCoverPhoto = async (): Promise<void> => {
  try {
    await apiClient.delete<ApiResponse<null>>("/users/remove-cover-photo");
  } catch (error) {
    return handleApiError(error);
  }
};

export const userService = {
  getAllUsers,
  getUserById,
  getUserByUsername,
  updateProfile,
  uploadProfilePicture,
  uploadCoverPhoto,
  removeProfilePicture,
  removeCoverPhoto,
};

export default userService;
