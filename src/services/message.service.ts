import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse } from "@/types/common.types";
import { IConversation, IMessage, SendMessagePayload } from "@/types/message.types";

export const getConversations = async (): Promise<IConversation[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IConversation[]>>("/messages/conversations");
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getMessages = async (receiverId: string): Promise<IMessage[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IMessage[]>>(`/messages/${receiverId}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const sendMessage = async (payload: SendMessagePayload): Promise<IMessage> => {
  try {
    const response = await apiClient.post<ApiResponse<IMessage>>("/messages", payload);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

