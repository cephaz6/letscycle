/**
 * Holds the session tokens for the API client. Deliberately framework-agnostic
 * (no Zustand/React here) so the same client works in a future React Native
 * app. The auth feature (step 4) mirrors this into its own store/persistence
 * and registers an `onSessionExpired` handler to redirect to login.
 *
 * The access token lives only in memory. Where the refresh token is persisted
 * (httpOnly cookie vs. secure storage) is the auth feature's decision — this
 * store just holds whatever it is given for the current session.
 */

interface Tokens {
  accessToken: string | null;
  refreshToken: string | null;
}

const tokens: Tokens = { accessToken: null, refreshToken: null };

let sessionExpiredHandler: (() => void) | null = null;
let tokensChangedHandler: ((tokens: Tokens) => void) | null = null;

export function setTokens(next: {
  accessToken: string;
  refreshToken: string;
}): void {
  tokens.accessToken = next.accessToken;
  tokens.refreshToken = next.refreshToken;
  tokensChangedHandler?.({ ...tokens });
}

export function clearTokens(): void {
  tokens.accessToken = null;
  tokens.refreshToken = null;
  tokensChangedHandler?.({ ...tokens });
}

/**
 * Register a callback fired whenever the tokens change (login, silent refresh,
 * logout) — the app uses this to persist the session. Returns an unsubscribe fn.
 */
export function onTokensChanged(
  handler: (tokens: { accessToken: string | null; refreshToken: string | null }) => void,
): () => void {
  tokensChangedHandler = handler;
  return () => {
    if (tokensChangedHandler === handler) tokensChangedHandler = null;
  };
}

export function getAccessToken(): string | null {
  return tokens.accessToken;
}

export function getRefreshToken(): string | null {
  return tokens.refreshToken;
}

/**
 * Register a callback fired when the session can no longer be refreshed
 * (refresh token missing, invalid, or reused). Returns an unsubscribe fn.
 */
export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
}

export function notifySessionExpired(): void {
  clearTokens();
  sessionExpiredHandler?.();
}
