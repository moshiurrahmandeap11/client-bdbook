export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    pages?: number;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
// Step 1: feat(interfaces): add pagination structure to ApiResponse
// Step 2: feat(interfaces): add senderUsername and actorUsername to notification data
// Step 3: feat(interfaces): add SendMessagePayload interface
// Step 4: feat(interfaces): define ChangePasswordPayload in auth.interface.ts
