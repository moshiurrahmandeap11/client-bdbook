import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse, QueryParams } from "@/types/common.types";
import { IUser, UpdateUserPayload } from "@/types/user.types";

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

export const updateProfile = async (payload: UpdateUserPayload): Promise<IUser> => {
  try {
    const response = await apiClient.patch<ApiResponse<IUser>>("/users/profile", payload);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const uploadAvatar = async (formData: FormData): Promise<{ avatar: string }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ avatar: string }>>("/users/upload-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

