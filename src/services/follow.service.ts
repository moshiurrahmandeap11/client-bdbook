import { apiClient, handleApiError } from "./api";

export interface IFollowStatusResponse {
  isFollowing: boolean;
  isFollowedBy: boolean;
}
