import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse } from "@/types/common.types";
import { AuthResponseData, ChangePasswordPayload, LoginPayload, RegisterPayload } from "@/types/auth.types";
import { IUser } from "@/types/user.types";

export const login = async (payload: LoginPayload): Promise<AuthResponseData> => {
  try {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/login", payload);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const register = async (payload: RegisterPayload): Promise<AuthResponseData> => {
  try {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/register", payload);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getMe = async (): Promise<IUser> => {
  try {
    const response = await apiClient.get<ApiResponse<IUser>>("/auth/me");
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  try {
    await apiClient.post<ApiResponse<null>>("/auth/change-password", payload);
  } catch (error) {
    return handleApiError(error);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post<ApiResponse<null>>("/auth/logout");
  } catch (error) {
    return handleApiError(error);
  }
};

export const googleAuth = async (payload: { idToken?: string; code?: string; redirectUri?: string }): Promise<AuthResponseData> => {
  try {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/google", payload);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};


