import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { UnauthorizedError } from '../../shared/errors/httpErrors.js';
import { AuthService, hashToken } from './auth.service.js';
import { createFakeCognito } from './cognito.fake.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const email = `auth-test-${runId}@example.com`;
const password = 'correct-horse-battery';
const meta = { userAgent: 'vitest', ipAddress: '127.0.0.1' };

describe.skipIf(!hasDb)('AuthService', () => {
  const { client } = createFakeCognito('test-secret-at-least-16-chars');
  let auth: AuthService;
  let userId: string;

  beforeAll(() => {
    auth = new AuthService(client, getDb());
  });

  afterAll(async () => {
    const db = getDb();
    await db.refreshToken.deleteMany({ where: { userId } });
    await db.outbox.deleteMany({ where: { aggregateId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
    await disconnectDb();
  });

  it('signup creates a user and emits user.created via the outbox', async () => {
    const result = await auth.signup({ email, password, displayName: 'Auth Tester' });
    userId = result.userId;

    const db = getDb();
    const user = await db.user.findUnique({ where: { id: userId } });
    expect(user?.email).toBe(email);
    expect(user?.accountStatus).toBe('active');

    const outbox = await db.outbox.findMany({ where: { aggregateId: userId } });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.eventType).toBe('user.created');
  });

  it('rejects duplicate signup with a conflict', async () => {
    await expect(
      auth.signup({ email, password: 'whatever-else', displayName: 'Dup' }),
    ).rejects.toThrow(/already exists|UsernameExists/);
  });

  it('login returns tokens and stores only the hash of the refresh token', async () => {
    const session = await auth.login({ email, password }, meta);

    expect(session.userId).toBe(userId);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const row = await getDb().refreshToken.findUnique({
      where: { tokenHash: hashToken(session.refreshToken) },
    });
    expect(row?.userId).toBe(userId);
    expect(row?.revokedAt).toBeNull();
    // The raw token must never be stored.
    expect(row?.tokenHash).not.toBe(session.refreshToken);
  });

  it('rejects login with a wrong password', async () => {
    await expect(auth.login({ email, password: 'wrong-password' }, meta)).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('refresh rotates the token: old revoked, new usable', async () => {
    const first = await auth.login({ email, password }, meta);
    const second = await auth.refresh(first.refreshToken, meta);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessToken).toBeTruthy();

    const oldRow = await getDb().refreshToken.findUnique({
      where: { tokenHash: hashToken(first.refreshToken) },
    });
    expect(oldRow?.revokedAt).not.toBeNull();

    const third = await auth.refresh(second.refreshToken, meta);
    expect(third.userId).toBe(userId);
  });

  it('reusing a rotated token revokes the whole session family', async () => {
    const a = await auth.login({ email, password }, meta);
    const b = await auth.refresh(a.refreshToken, meta);

    // Replay of the already-rotated token `a` — theft signal.
    await expect(auth.refresh(a.refreshToken, meta)).rejects.toThrow(UnauthorizedError);

    // The fresh token `b` must now be dead too.
    await expect(auth.refresh(b.refreshToken, meta)).rejects.toThrow(UnauthorizedError);
  });

  it('logout revokes the refresh token and is idempotent', async () => {
    const session = await auth.login({ email, password }, meta);

    await auth.logout(session.refreshToken);
    await expect(auth.refresh(session.refreshToken, meta)).rejects.toThrow(
      UnauthorizedError,
    );
    await expect(auth.logout(session.refreshToken)).resolves.toBeUndefined();
  });

  it('rejects unknown refresh tokens', async () => {
    await expect(auth.refresh('made-up-token', meta)).rejects.toThrow(UnauthorizedError);
  });
});
