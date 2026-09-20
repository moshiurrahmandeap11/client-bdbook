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
// Step 5: refactor(services): add fallback ID lookup to getUserByUsername in user.service.ts
// Step 6: feat(profile): add user avatar and cover photo display in UserProfilePage
// Step 7: feat(profile): display user bio, location, website, and join date in UserProfilePage
// Step 8: feat(profile): fetch and display user posts in UserProfilePage
// Step 9: feat(profile): add empty state and loading state for UserProfilePage
// Step 10: feat(profile): implement automatic URL rewriting with router.replace in UserProfilePage
// Step 11: feat(search): implement SearchContent component with useSearchParams
// Step 12: feat(search): add filter tabs for All, Users, and Posts in SearchPage
// Step 13: feat(search): display matching users with avatars and @username links in SearchPage
// Step 14: feat(search): display matching posts using PostCard in SearchPage
// Step 15: feat(search): add Suspense boundary for SearchPage
// Step 16: feat(post): load post data using postService.getPostById in PostDetailsPage
// Step 17: feat(post): render PostCard and back button in PostDetailsPage
// Step 18: feat(post): implement comments list with user avatars and timestamps in PostDetailsPage
