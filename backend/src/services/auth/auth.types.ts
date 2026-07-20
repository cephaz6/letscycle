import type { Uuid } from '../../shared/types/common.js';

// Seam for AWS Cognito. The dummy implementation (cognito.dummy.ts) serves dev
// and tests; the real one (AWS SDK + hosted user pool) plugs in unchanged when
// infrastructure lands. Real-Cognito note: refreshSession will need Cognito's
// own refresh token persisted (encrypted column) — deferred until then.
export interface CognitoClient {
  signUp(input: { email: string; password: string }): Promise<{ cognitoSub: string }>;
  initiateAuth(input: {
    email: string;
    password: string;
  }): Promise<{ cognitoSub: string; accessToken: string; expiresInSeconds: number }>;
  refreshSession(input: {
    cognitoSub: string;
  }): Promise<{ accessToken: string; expiresInSeconds: number }>;
  // Mint an access token for an already-known identity (e.g. after federated
  // Google sign-in), without a password. Real Cognito federation issues these
  // via the hosted pool; the dummy mints a dev JWT.
  issueAccessToken(input: {
    cognitoSub: string;
    email: string;
  }): Promise<{ accessToken: string; expiresInSeconds: number }>;
}

// Verified Google identity from an ID token.
export interface GoogleProfile {
  googleSub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  pictureUrl?: string;
}

export interface GoogleVerifier {
  verify(idToken: string): Promise<GoogleProfile>;
}

export interface TokenClaims {
  cognitoSub: string;
  email?: string;
  roles: string[];
}

// Verifies Bearer JWTs. Real implementation checks Cognito's JWKS via jose;
// the dummy verifies HS256 tokens minted by the dummy Cognito client.
export interface TokenVerifier {
  verify(token: string): Promise<TokenClaims>;
}

export interface RequestMeta {
  userAgent: string;
  ipAddress: string;
}

export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthSession {
  userId: Uuid;
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
}
