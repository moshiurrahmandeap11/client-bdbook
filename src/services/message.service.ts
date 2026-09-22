import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse } from "@/types/common.types";
import {
  IConversation,
  IMessage,
  SendMessagePayload,
  IUploadMessageMediaResponse,
  ICreateGroupPayload,
} from "@/types/message.types";

export const getConversations = async (): Promise<IConversation[]> => {
  try {
    const response = await apiClient.get<ApiResponse<any[]>>("/messages/conversations");
    const rawList = response.data.data || [];
    return rawList.map((item) => {
      const friendId = item.friendId || item.id || item._id;
      const friendName = item.friendName || item.name || "User";
      const friendProfilePicture = item.friendProfilePicture || item.avatar || null;
      return {
        id: friendId,
        _id: friendId,
        friendId,
        friendName,
        friendProfilePicture,
        lastMessage: item.lastMessage || null,
        lastMessageTime: item.updatedAt || item.createdAt || null,
        unreadCount: item.unreadCount || 0,
        createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        isRequest: Boolean(item.isRequest),
        isGroup: Boolean(item.isGroup),
        adminId: item.adminId || null,
        participants: item.participants || [
          {
            id: friendId,
            userId: friendId,
            unreadCount: item.unreadCount || 0,
            user: {
              id: friendId,
              fullName: friendName,
              profilePicUrl: friendProfilePicture,
            },
            name: friendName,
            avatar: friendProfilePicture,
          },
        ],
      };
    });
  } catch (error) {
    return handleApiError(error);
  }
};

export const getMessages = async (friendId: string): Promise<IMessage[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IMessage[]>>(`/messages/messages/${friendId}`);
    const rawList = response.data.data || [];
    return rawList.map((m) => ({
      ...m,
      id: m.id || m._id || "",
      text: m.message || m.text || "",
      message: m.message || m.text || "",
      reactions: m.reactions || [],
    }));
  } catch (error) {
    return handleApiError(error);
  }
};

export const sendMessage = async (payload: SendMessagePayload): Promise<IMessage> => {
  try {
    const textContent = payload.message || payload.text || "";
    const body = {
      message: textContent,
      messageType: payload.messageType || "text",
      mediaUrl: payload.mediaUrl || null,
      fileName: payload.fileName || null,
      fileSize: payload.fileSize || null,
      tempId: payload.tempId || null,
    };
    const response = await apiClient.post<ApiResponse<IMessage>>(
      `/messages/send-message/${payload.receiverId}`,
      body
    );
    const m = response.data.data;
    return {
      ...m,
      id: m.id || m._id || "",
      text: m.message || m.text || "",
      message: m.message || m.text || "",
      reactions: m.reactions || [],
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const reactToMessage = async (
  messageId: string,
  reaction: string
): Promise<{ messageId: string; reactions: any[] }> => {
  try {
    const response = await apiClient.post<
      ApiResponse<{ messageId: string; reactions: any[] }>
    >(`/messages/messages/react/${messageId}`, { reaction });
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createGroup = async (
  payload: ICreateGroupPayload
): Promise<IConversation> => {
  try {
    const response = await apiClient.post<ApiResponse<any>>("/messages/group", payload);
    const item = response.data.data;
    const friendId = item.friendId || item.id || item._id;
    return {
      id: friendId,
      _id: friendId,
      friendId,
      friendName: item.friendName || item.name || "Group",
      friendProfilePicture: item.friendProfilePicture || item.avatar || null,
      lastMessage: item.lastMessage || null,
      lastMessageTime: item.updatedAt || item.createdAt || null,
      unreadCount: 0,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      isRequest: false,
      isGroup: true,
      adminId: item.adminId || null,
      participants: item.participants || [],
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const markAsRead = async (senderId: string): Promise<void> => {
  try {
    await apiClient.patch<ApiResponse<null>>(`/messages/messages/read/${senderId}`);
  } catch (error) {
    return handleApiError(error);
  }
};

export const markMessageAsRead = markAsRead;

export const getUnreadCount = async (): Promise<number> => {
  try {
    const response = await apiClient.get<ApiResponse<{ count: number }>>("/messages/unread-messages/count");
    return response.data.data?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const uploadMessageMedia = async (file: File): Promise<IUploadMessageMediaResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiResponse<IUploadMessageMediaResponse>>(
      "/messages/upload-message-media",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const acceptMessageRequest = async (partnerId: string): Promise<void> => {
  try {
    await apiClient.post<ApiResponse<null>>(`/messages/requests/accept/${partnerId}`);
  } catch (error) {
    return handleApiError(error);
  }
};

export const declineMessageRequest = async (partnerId: string): Promise<void> => {
  try {
    await apiClient.delete<ApiResponse<null>>(`/messages/requests/decline/${partnerId}`);
  } catch (error) {
    return handleApiError(error);
  }
};
