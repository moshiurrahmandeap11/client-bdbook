export interface MetaData {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  statusCode?: number;
  success: boolean;
  message?: string;
  meta?: MetaData;
  pagination?: Pagination;
  data: T;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
