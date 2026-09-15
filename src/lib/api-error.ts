import { AxiosError } from "axios";

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  errorMessages?: Array<{ path: string | number; message: string }>;
  stack?: string;
}

export const handleApiError = (error: unknown): never => {
  if (error && typeof error === "object" && "response" in error) {
    const axiosErr = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosErr.response?.data;
    const message = responseData?.message || axiosErr.message || "Something went wrong!";
    throw new Error(message);
  }
  
  if (error instanceof Error) {
    throw error;
  }

  throw new Error("An unexpected error occurred.");
};

