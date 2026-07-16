import { http } from '../http';
import { clearTokens, getRefreshToken, setTokens } from '../token-store';

// --- Types (hand-written to match backend auth responses) ---

export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignupResponse {
  userId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
}

// --- Endpoints ---

export const authApi = {
  /** Create an account. Does not start a session — call `login` next. */
  signup(input: SignupInput): Promise<SignupResponse> {
    return http.post<SignupResponse>('/auth/signup', { json: input, auth: false });
  },

  /** Authenticate and persist the returned tokens in the client store. */
  async login(input: LoginInput): Promise<AuthSession> {
    const session = await http.post<AuthSession>('/auth/login', {
      json: input,
      auth: false,
    });
    setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return session;
  },

  /** Exchange a Google ID token (credential) for a session. */
  async loginWithGoogle(credential: string): Promise<AuthSession> {
    const session = await http.post<AuthSession>('/auth/google', {
      json: { credential },
      auth: false,
    });
    setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return session;
  },

  /** Manually rotate the session (the http layer also does this on 401). */
  async refresh(): Promise<AuthSession | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    const session = await http.post<AuthSession>('/auth/refresh', {
      json: { refreshToken },
      auth: false,
      skipRefresh: true,
    });
    setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return session;
  },

  /** Revoke the refresh token server-side and clear local tokens. */
  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await http.post<void>('/auth/logout', {
          json: { refreshToken },
          auth: false,
          skipRefresh: true,
        });
      }
    } finally {
      clearTokens();
    }
  },
};
