/** Error body the backend returns for every operational failure. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

/**
 * Thrown by the API client for any non-2xx response. `code` mirrors the
 * backend error code (e.g. 'badRequest', 'unauthorized', 'notFound'), so
 * callers can branch on it without string-matching messages.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** True for auth failures (expired/invalid token, bad credentials). */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error?.code === 'string'
  );
}

/** Build an ApiError from a parsed response body, with sensible fallbacks. */
export function toApiError(status: number, body: unknown): ApiError {
  if (isApiErrorBody(body)) {
    return new ApiError(status, body.error.code, body.error.message);
  }
  return new ApiError(status, 'unknown', `Request failed with status ${status}`);
}
