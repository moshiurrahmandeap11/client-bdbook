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
// [wip step 1/3]
