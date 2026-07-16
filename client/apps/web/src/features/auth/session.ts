// Session persistence for the browser. The access token is short-lived; the
// refresh token is the durable credential. We persist both so a reload can
// restore the session without a round-trip, and keep them in sync with the
// api-client token store (which rotates them on silent refresh).

const STORAGE_KEY = 'letscycle-session';

export interface StoredSession {
  accessToken: string | null;
  refreshToken: string | null;
}

export function persistTokens(tokens: StoredSession): void {
  try {
    if (tokens.refreshToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable (private mode) — session lasts the tab only */
  }
}

export function readStoredTokens(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}
