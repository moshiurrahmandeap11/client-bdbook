import apiClient from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { ApiResponse, QueryParams } from "@/types/common.types";
import { CreateCommentPayload, CreatePostPayload, IPost } from "@/types/post.types";

export const getPosts = async (params?: QueryParams): Promise<ApiResponse<IPost[]>> => {
  try {
    const response = await apiClient.get<ApiResponse<IPost[]>>("/posts", { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getFeed = getPosts;

export const getUserPosts = async (userId: string): Promise<ApiResponse<IPost[]>> => {
  try {
    const response = await apiClient.get<ApiResponse<IPost[]>>(`/posts/user/${userId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPostById = async (id: string): Promise<IPost> => {
  try {
    const response = await apiClient.get<ApiResponse<IPost>>(`/posts/${id}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createPost = async (payload: FormData | CreatePostPayload): Promise<ApiResponse<IPost>> => {
  try {
    const headers = payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined;
    const response = await apiClient.post<ApiResponse<IPost>>("/posts/create", payload, { headers });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const likePost = async (postId: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/posts/${postId}/like`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const commentPost = async (postId: string, text: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/posts/${postId}/comment`, { text });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createComment = async (payload: CreateCommentPayload): Promise<any> => {
  return commentPost(payload.postId, payload.text);
};

export const sharePost = async (
  postId: string,
  payload?: { description?: string }
): Promise<any> => {
  try {
    const response = await apiClient.post(`/posts/${postId}/share`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updatePost = async (postId: string, payload: { description: string }): Promise<any> => {
  try {
    const response = await apiClient.patch(`/posts/${postId}`, payload);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deletePost = async (postId: string): Promise<any> => {
  try {
    const response = await apiClient.delete(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const postService = {
  getPosts,
  getFeed,
  getUserPosts,
  getPostById,
  createPost,
  likePost,
  commentPost,
  createComment,
  sharePost,
  updatePost,
  deletePost,
};

