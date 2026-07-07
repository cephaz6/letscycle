import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { CognitoClient, TokenClaims, TokenVerifier } from './auth.types.js';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

// In-memory Cognito stand-in for dev and tests: real JWTs (HS256, shared dev
// secret) so the auth middleware exercises genuine verification. The real
// implementation uses Cognito's hosted pool and RS256 JWKS behind the same
// interfaces. Never used in production — server boot forbids it.
export function createDummyCognito(secret: string): {
  client: CognitoClient;
  verifier: TokenVerifier;
} {
  const key = new TextEncoder().encode(secret);
  const accounts = new Map<string, { password: string; cognitoSub: string }>();

  async function mintAccessToken(cognitoSub: string, email: string): Promise<string> {
    return new SignJWT({ email, 'cognito:groups': ['user'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(cognitoSub)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(key);
  }

  const client: CognitoClient = {
    signUp({ email, password }) {
      if (accounts.has(email)) {
        return Promise.reject(new Error('UsernameExistsException'));
      }
      const cognitoSub = randomUUID();
      accounts.set(email, { password, cognitoSub });
      return Promise.resolve({ cognitoSub });
    },

    async initiateAuth({ email, password }) {
      const account = accounts.get(email);
      if (!account || account.password !== password) {
        throw new Error('NotAuthorizedException');
      }
      return {
        cognitoSub: account.cognitoSub,
        accessToken: await mintAccessToken(account.cognitoSub, email),
        expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      };
    },

    async refreshSession({ cognitoSub }) {
      const entry = [...accounts.entries()].find(
        ([, account]) => account.cognitoSub === cognitoSub,
      );
      if (!entry) {
        throw new Error('NotAuthorizedException');
      }
      return {
        accessToken: await mintAccessToken(cognitoSub, entry[0]),
        expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      };
    },
  };

  const verifier: TokenVerifier = {
    async verify(token: string): Promise<TokenClaims> {
      const { payload } = await jwtVerify(token, key);
      if (typeof payload.sub !== 'string') {
        throw new Error('Token has no subject');
      }
      const groups = payload['cognito:groups'];
      return {
        cognitoSub: payload.sub,
        ...(typeof payload['email'] === 'string' && { email: payload['email'] }),
        roles: Array.isArray(groups) ? groups.map(String) : ['user'],
      };
    },
  };

  return { client, verifier };
}
