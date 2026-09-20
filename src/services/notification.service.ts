import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import {
  ApiResponse,
  INotificationItem,
  IUnreadCountResponse,
} from "@/interfaces";

export const getUserNotifications = async (
  page = 1,
  limit = 20
): Promise<{ data: INotificationItem[]; unreadCount: number }> => {
  try {
    const response = await apiClient.get<
      ApiResponse<INotificationItem[]> & { unreadCount: number }
    >(`/notifications?page=${page}&limit=${limit}`);
    return {
      data: response.data.data || [],
      unreadCount: response.data.unreadCount ?? 0,
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const getUnreadNotificationsCount = async (): Promise<number> => {
  try {
    const response = await apiClient.get<ApiResponse<IUnreadCountResponse>>(
      "/notifications/unread/count"
    );
    return response.data?.data?.unreadCount ?? (response.data as any)?.unreadCount ?? 0;
  } catch (error) {
    return handleApiError(error);
  }
};

export const markAsRead = async (
  notificationId: string
): Promise<INotificationItem> => {
  try {
    const response = await apiClient.patch<ApiResponse<INotificationItem>>(
      `/notifications/${notificationId}/read`
    );
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

export const notificationService = {
  getUserNotifications,
  getUnreadNotificationsCount,
  markAsRead,
  markAllAsRead,
};

export default notificationService;
