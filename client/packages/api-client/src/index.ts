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

// Query layer
export { ApiProvider, createQueryClient } from './query/query-provider';
export { queryKeys } from './query/keys';

// Hooks
export { useSignup, useLogin, useLogout } from './hooks/use-auth';
export {
  useHealth,
  usePublicSettings,
  useCurrentTerms,
  useAcceptCurrentTerms,
} from './hooks/use-system';
