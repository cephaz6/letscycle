import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import {
  createUser,
  getUserById,
  getUserByCognitoSub,
  getUserByEmail,
} from '../users/index.js';
import { recordAudit } from '../system/index.js';
import * as repo from './auth.repository.js';
import { BadRequestError } from '../../shared/errors/httpErrors.js';
import type {
  AuthSession,
  CognitoClient,
  GoogleVerifier,
  RequestMeta,
  SignupInput,
} from './auth.types.js';

const REFRESH_TOKEN_TTL_DAYS = 30;

// Revokes every active session for a user (e.g. on account deletion).
export async function revokeAllSessions(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  await repo.revokeAllForUser(db, userId);
}

export class AuthService {
  constructor(
    private readonly cognito: CognitoClient,
    private readonly db: PrismaClient = getDb(),
    private readonly googleVerifier?: GoogleVerifier,
  ) {}

  // Federated Google sign-in. Verifies the Google ID token, then finds or
  // creates the matching account and issues a session. An existing account with
  // the same email (e.g. from email/password) is reused, so Google is a true
  // alternative sign-in for the same user.
  async loginWithGoogle(idToken: string, meta: RequestMeta): Promise<AuthSession> {
    if (!this.googleVerifier) {
      throw new BadRequestError('Google sign-in is not configured');
    }
    const profile = await this.googleVerifier.verify(idToken);

    const googleSub = `google:${profile.googleSub}`;
    let user =
      (await getUserByCognitoSub(googleSub, this.db)) ??
      (await getUserByEmail(profile.email, this.db));

    if (!user) {
      user = await createUser(
        {
          email: profile.email,
          displayName: profile.name,
          cognitoSub: googleSub,
          ...(profile.pictureUrl ? { avatarUrl: profile.pictureUrl } : {}),
        },
        this.db,
      );
    } else if (user.accountStatus !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    const session = await this.cognito.issueAccessToken({
      cognitoSub: user.cognitoSub,
      email: user.email,
    });
    const refreshToken = await this.issueRefreshToken(user.id, meta);
    await recordAudit(
      {
        actorUserId: user.id,
        action: 'auth.login.google',
        targetType: 'user',
        targetId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
      this.db,
    );
    return {
      userId: user.id,
      accessToken: session.accessToken,
      expiresInSeconds: session.expiresInSeconds,
      refreshToken,
    };
  }

  async signup(input: SignupInput): Promise<{ userId: string }> {
    const { cognitoSub } = await this.cognito
      .signUp({ email: input.email, password: input.password })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message.includes('UsernameExists')) {
          throw new ConflictError('An account with this email already exists');
        }
        throw error;
      });
    const user = await createUser(
      { email: input.email, displayName: input.displayName, cognitoSub },
      this.db,
    );
    return { userId: user.id };
  }

  async login(
    input: { email: string; password: string },
    meta: RequestMeta,
  ): Promise<AuthSession> {
    const session = await this.cognito
      .initiateAuth(input)
      .catch(() => Promise.reject(new UnauthorizedError('Invalid credentials')));

    const user = await getUserByCognitoSub(session.cognitoSub, this.db);
    if (!user || user.accountStatus !== 'active') {
      throw new UnauthorizedError('Invalid credentials');
    }

    const refreshToken = await this.issueRefreshToken(user.id, meta);
    await recordAudit(
      {
        actorUserId: user.id,
        action: 'auth.login',
        targetType: 'user',
        targetId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
      this.db,
    );
    return {
      userId: user.id,
      accessToken: session.accessToken,
      expiresInSeconds: session.expiresInSeconds,
      refreshToken,
    };
  }

  async refresh(presentedToken: string, meta: RequestMeta): Promise<AuthSession> {
    const row = await repo.findByTokenHash(this.db, hashToken(presentedToken));
    if (!row) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    if (row.revokedAt) {
      // Rotation means a legitimate client never re-presents an old token.
      // Reuse signals theft — revoke every active session for the user.
      await repo.revokeAllForUser(this.db, row.userId);
      throw new UnauthorizedError('Invalid refresh token');
    }
    if (row.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await this.requireActiveUser(row.userId);
    await repo.revokeById(this.db, row.id);
    const refreshToken = await this.issueRefreshToken(user.id, meta);
    const session = await this.cognito.refreshSession({ cognitoSub: user.cognitoSub });

    return {
      userId: user.id,
      accessToken: session.accessToken,
      expiresInSeconds: session.expiresInSeconds,
      refreshToken,
    };
  }

  async logout(presentedToken: string): Promise<void> {
    const row = await repo.findByTokenHash(this.db, hashToken(presentedToken));
    if (row && !row.revokedAt) {
      await repo.revokeById(this.db, row.id);
    }
    // Unknown or already-revoked tokens: logout is idempotent, nothing to do.
  }

  private async issueRefreshToken(userId: string, meta: RequestMeta): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await repo.insertRefreshToken(this.db, {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ...meta,
    });
    return token;
  }

  private async requireActiveUser(userId: string) {
    const user = await getUserById(userId, this.db);
    if (!user || user.accountStatus !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }
    return user;
  }
}

// Only the hash is stored: a DB leak must not leak usable session tokens.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
