import { createHmac, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { SignJWT, jwtVerify } from 'jose';
import type { CognitoClient, TokenClaims, TokenVerifier } from './auth.types.js';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

interface StoredAccount {
  passwordHash: string;
  cognitoSub: string;
}

export interface DummyCognito {
  client: CognitoClient;
  verifier: TokenVerifier;
}

// In-memory Cognito stand-in for dev and tests: real JWTs (HS256, shared dev
// secret) so the auth middleware exercises genuine verification. The real
// implementation uses Cognito's hosted pool and RS256 JWKS behind the same
// interfaces. Never used in production — server boot forbids it.
//
// Accounts optionally persist to a JSON file (dev docker volume) so a container
// restart no longer wipes every email/password login. Passwords are stored as
// an HMAC, not plaintext.
export function createDummyCognito(
  secret: string,
  options: { persistPath?: string } = {},
): DummyCognito {
  const key = new TextEncoder().encode(secret);
  const accounts = new Map<string, StoredAccount>();
  const persistPath = options.persistPath;

  function hashPassword(password: string): string {
    return createHmac('sha256', secret).update(password).digest('hex');
  }

  function load(): void {
    if (!persistPath || !existsSync(persistPath)) return;
    try {
      const raw = JSON.parse(readFileSync(persistPath, 'utf8')) as Record<
        string,
        StoredAccount
      >;
      for (const [email, account] of Object.entries(raw)) {
        accounts.set(email, account);
      }
    } catch {
      // Corrupt or empty file — start from an empty store.
    }
  }

  function save(): void {
    if (!persistPath) return;
    mkdirSync(dirname(persistPath), { recursive: true });
    writeFileSync(persistPath, JSON.stringify(Object.fromEntries(accounts), null, 2));
  }

  load();

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
      accounts.set(email, { passwordHash: hashPassword(password), cognitoSub });
      save();
      return Promise.resolve({ cognitoSub });
    },

    async initiateAuth({ email, password }) {
      const account = accounts.get(email);
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
      // Federated (e.g. Google) users aren't in the accounts map; still mint a
      // fresh token — the email claim is best-effort.
      const entry = [...accounts.entries()].find(
        ([, account]) => account.cognitoSub === cognitoSub,
      );
      return {
        accessToken: await mintAccessToken(cognitoSub, entry?.[0] ?? ''),
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
