import { createHmac, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { CognitoClient, TokenClaims, TokenVerifier } from './auth.types.js';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

export interface StoredAccount {
  passwordHash: string;
  cognitoSub: string;
}

/**
 * Where dummy credentials live. Backed by the database so a password shares its
 * user's lifecycle — a side-car file could be cleared or lost independently,
 * which locked users out of accounts that still existed.
 */
export interface DummyAccountStore {
  findByEmail(email: string): Promise<StoredAccount | null>;
  upsert(email: string, account: StoredAccount): Promise<void>;
}

export interface DummyCognito {
  client: CognitoClient;
  verifier: TokenVerifier;
}

/** Shared with the dev password tool so stored hashes stay compatible. */
export function hashDevPassword(secret: string, password: string): string {
  return createHmac('sha256', secret).update(password).digest('hex');
}

// Cognito stand-in for dev and tests: real JWTs (HS256, shared dev secret) so
// the auth middleware exercises genuine verification. The real implementation
// uses Cognito's hosted pool and RS256 JWKS behind the same interfaces. Never
// used in production — server boot forbids it.
//
// Credentials are read through a store (the database in dev) on every call, so
// there is no in-process cache to go stale and nothing to lose on restart.
// Passwords are stored as an HMAC, never plaintext.
export function createDummyCognito(
  secret: string,
  options: { store?: DummyAccountStore } = {},
): DummyCognito {
  const key = new TextEncoder().encode(secret);
  const store = options.store;
  // Fallback for tests/CI that construct the dummy without a store.
  const memory = new Map<string, StoredAccount>();

  function hashPassword(password: string): string {
    return hashDevPassword(secret, password);
  }

  async function findAccount(email: string): Promise<StoredAccount | null> {
    if (store) return store.findByEmail(email);
    return memory.get(email) ?? null;
  }

  async function saveAccount(email: string, account: StoredAccount): Promise<void> {
    if (store) return store.upsert(email, account);
    memory.set(email, account);
  }

  async function mintAccessToken(cognitoSub: string, email: string): Promise<string> {
    return new SignJWT({ email, 'cognito:groups': ['user'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(cognitoSub)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(key);
  }

  const client: CognitoClient = {
    async signUp({ email, password }) {
      if (await findAccount(email)) {
        throw new Error('UsernameExistsException');
      }
      const cognitoSub = randomUUID();
      await saveAccount(email, { passwordHash: hashPassword(password), cognitoSub });
      return { cognitoSub };
    },

    async initiateAuth({ email, password }) {
      const account = await findAccount(email);
      if (!account || account.passwordHash !== hashPassword(password)) {
        throw new Error('NotAuthorizedException');
      }
      return {
        cognitoSub: account.cognitoSub,
        accessToken: await mintAccessToken(account.cognitoSub, email),
        expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      };
    },

    async refreshSession({ cognitoSub }) {
      // Federated (e.g. Google) users have no stored credential; still mint a
      // fresh token — the email claim is best-effort.
      return {
        accessToken: await mintAccessToken(cognitoSub, ''),
        expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      };
    },

    async issueAccessToken({ cognitoSub, email }) {
      return {
        accessToken: await mintAccessToken(cognitoSub, email),
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
