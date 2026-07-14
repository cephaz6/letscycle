import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { AuthService, createDummyCognito } from '../../services/auth/index.js';
import { StorageService, createDummyStorage } from '../../services/system/index.js';
import { createListing } from '../../services/listings/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';
const L = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 };

describe.skipIf(!hasDb)('privacy (erasure, export, security)', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let categoryId: string;
  const userIds: string[] = [];

  async function register(): Promise<{
    email: string;
    token: string;
    id: string;
  }> {
    const email = `privacy-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Privacy Tester' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const id = (signup.body as { userId: string }).userId;
    userIds.push(id);
    return {
      email,
      token: (login.body as { accessToken: string }).accessToken,
      id,
    };
  }

  beforeAll(async () => {
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
      storageService: new StorageService(createDummyStorage(), 'test-bucket', getDb()),
    });
    const cat = await getDb().category.create({
      data: {
        slug: `privacy-cat-${runId}`,
        name: 'c',
        typicalDistanceKm: 10,
        iconName: 'x',
      },
      select: { id: true },
    });
    categoryId = cat.id;
  });

  afterAll(async () => {
    const db = getDb();
    const listings = await db.listing.findMany({
      where: { sellerId: { in: userIds } },
      select: { id: true },
    });
    const listingIds = listings.map((l) => l.id);
    await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await db.wishlistItem.deleteMany({ where: { userId: { in: userIds } } });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.pushSubscription.deleteMany({ where: { userId: { in: userIds } } });
    await db.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await db.outbox.deleteMany({ where: { aggregateId: { in: listingIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await disconnectDb();
  });

  it('sets security headers (helmet)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers).toHaveProperty('x-dns-prefetch-control');
  });

  it('GET /users/me/export bundles the caller data and writes an audit row', async () => {
    const user = await register();
    await createListing({
      sellerId: user.id,
      title: 'My table',
      description: 'nice',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: 5000,
      location: L,
      publish: true,
    });

    const res = await request(app)
      .get('/api/v1/users/me/export')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    const body = res.body as { profile: { id: string }; listings: unknown[] };
    expect(body.profile.id).toBe(user.id);
    expect(body.listings.length).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('wishlists');
    expect(res.body).toHaveProperty('transactions');
    expect(res.body).toHaveProperty('reviews');

    const audit = await getDb().auditLog.count({
      where: { actorUserId: user.id, action: 'user.dataExported' },
    });
    expect(audit).toBe(1);
  });

  it('DELETE /users/me anonymises the account, revokes sessions, and audits', async () => {
    const user = await register();
    await request(app)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ endpoint: `https://push.example/${randomUUID()}`, keys: { a: 'b' } })
      .catch(() => undefined); // notifications router not mounted here; ignore

    const del = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(del.status).toBe(204);

    const row = await getDb().user.findUnique({ where: { id: user.id } });
    expect(row?.accountStatus).toBe('deleted');
    expect(row?.email).not.toBe(user.email);
    expect(row?.displayName).toBe('Deleted user');
    expect(row?.phone).toBeNull();

    // Sessions revoked.
    const active = await getDb().refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(active).toBe(0);

    const audit = await getDb().auditLog.count({
      where: { actorUserId: user.id, action: 'user.accountDeleted' },
    });
    expect(audit).toBe(1);

    // Idempotent.
    const again = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(again.status).toBe(401); // token verifies but account no longer active
  });

  it('login writes an audit row', async () => {
    const user = await register();
    const audit = await getDb().auditLog.count({
      where: { actorUserId: user.id, action: 'auth.login' },
    });
    expect(audit).toBeGreaterThanOrEqual(1);
  });
});
