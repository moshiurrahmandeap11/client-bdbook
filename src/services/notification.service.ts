import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse } from "@/types/common.types";
import { INotification } from "@/types/notification.types";

export const getUserNotifications = async (): Promise<INotification[]> => {
  try {
    const response = await apiClient.get<ApiResponse<INotification[]>>("/notifications");
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const markAsRead = async (notificationId: string): Promise<INotification> => {
  try {
    const response = await apiClient.patch<ApiResponse<INotification>>(`/notifications/${notificationId}/read`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const markAllAsRead = async (): Promise<void> => {
  try {
    await apiClient.patch<ApiResponse<null>>("/notifications/read-all");
  } catch (error) {
    return handleApiError(error);
  }
};

