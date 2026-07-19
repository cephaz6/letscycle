// Config
export { API_BASE_URL } from './config';

// Errors
export { ApiError, toApiError, type ApiErrorBody } from './errors';

// Low-level HTTP (features normally use endpoint modules / hooks instead)
export { http, type RequestOptions } from './http';

// Token store (wired by the auth feature)
export {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onSessionExpired,
  notifySessionExpired,
  onTokensChanged,
} from './token-store';

// Endpoints
export {
  authApi,
  type SignupInput,
  type SignupResponse,
  type LoginInput,
  type AuthSession,
} from './endpoints/auth';
export {
  systemApi,
  UPLOAD_PURPOSES,
  UPLOAD_CONTENT_TYPES,
  type HealthStatus,
  type PublicSettings,
  type CurrentTerms,
  type TermsAcceptance,
  type UploadPurpose,
  type UploadContentType,
  type CreateUploadInput,
  type CreateUploadResult,
} from './endpoints/system';
export {
  usersApi,
  type MyProfile,
  type PublicProfile,
  type UpdateProfileInput,
} from './endpoints/users';
export { categoriesApi, type Category } from './endpoints/categories';
export {
  listingsApi,
  resolveImageUrl,
  uploadToPresignedUrl,
  type ListingSummary,
  type ListingDetail,
  type ListingPhoto,
  type ListingCondition,
  type ListingType,
  type ListingStatus,
  type ListingSort,
  type GeoPoint,
  type SearchListingsParams,
  type SearchListingsResult,
  type CreateListingInput,
  type PhotoUploadRequest,
  type PhotoUploadTicket,
} from './endpoints/listings';

// Query layer
export { ApiProvider, createQueryClient } from './query/query-provider';
export { queryKeys } from './query/keys';

// Hooks
export { useSignup, useLogin, useLogout, useGoogleLogin } from './hooks/use-auth';
export {
  useHealth,
  usePublicSettings,
  useCurrentTerms,
  useAcceptCurrentTerms,
} from './hooks/use-system';
export { useCategories } from './hooks/use-categories';
export {
  useListings,
  useListing,
  useFavourites,
  useToggleFavourite,
} from './hooks/use-listings';
export {
  messagesApi,
  type Conversation,
  type Message,
  type ConversationStatus,
} from './endpoints/messages';
export {
  useConversations,
  useMessages,
  usePublicProfile,
  useListingDetail,
  useStartConversation,
  useSendMessage,
} from './hooks/use-messages';
export {
  transactionsApi,
  type Transaction,
  type TransactionStatus,
  type PayoutStatus,
  type Dispute,
} from './endpoints/transactions';
export {
  useMyTransactions,
  useTransaction,
  useCreateTransaction,
  useConfirmTransaction,
  useCompleteTransaction,
  useDisputeTransaction,
  usePayoutStatus,
  useOnboardPayouts,
} from './hooks/use-transactions';
