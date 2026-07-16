import { API_BASE_URL } from './config';
import { toApiError } from './errors';
import {
  getAccessToken,
  getRefreshToken,
  notifySessionExpired,
  setTokens,
} from './token-store';

export interface RequestOptions {
  /** Query params appended to the URL (undefined/null values are skipped). */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body — serialised and sent with `Content-Type: application/json`. */
  json?: unknown;
  /** Attach the Bearer access token (default true). */
  auth?: boolean;
  /** Skip the refresh-on-401 dance (used by the refresh call itself). */
  skipRefresh?: boolean;
  signal?: AbortSignal;
}

/** Shape returned by /auth/refresh (and /auth/login). */
interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  userId: string;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// Single-flight: concurrent 401s share one refresh round-trip.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return false;
  const session = (await res.json()) as SessionTokens;
  setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  return true;
}

function ensureRefresh(): Promise<boolean> {
  refreshInFlight ??= refreshSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function send(path: string, method: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';

  const useAuth = options.auth ?? true;
  if (useAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

async function request<T>(
  path: string,
  method: string,
  options: RequestOptions = {},
): Promise<T> {
  let res = await send(path, method, options);

  // Transparent refresh: on a 401 for an authenticated call, refresh once and retry.
  if (res.status === 401 && (options.auth ?? true) && !options.skipRefresh) {
    const refreshed = await ensureRefresh();
    if (refreshed) {
      res = await send(path, method, options);
    } else {
      notifySessionExpired();
    }
  }

  const body = await parseBody(res);
  if (!res.ok) {
    if (res.status === 401) notifySessionExpired();
    throw toApiError(res.status, body);
  }
  return body as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, 'GET', options),
  post: <T>(path: string, options?: RequestOptions) => request<T>(path, 'POST', options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>(path, 'PATCH', options),
  put: <T>(path: string, options?: RequestOptions) => request<T>(path, 'PUT', options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, 'DELETE', options),
};
