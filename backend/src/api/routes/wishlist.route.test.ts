import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { AuthService, createDummyCognito } from '../../services/auth/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';

describe.skipIf(!hasDb)('wishlists API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let token: string;
  let otherToken: string;

  async function register(): Promise<string> {
    const email = `wishlist-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Wishlist Api' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    return (login.body as { accessToken: string }).accessToken;
  }

  beforeAll(async () => {
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
    });
    token = await register();
    otherToken = await register();
  });

  afterAll(async () => {
    const db = getDb();
    await db.wishlistItem.deleteMany({
      where: { user: { email: { contains: `wishlist-api-${runId}` } } },
    });
    await db.refreshToken.deleteMany({
      where: { user: { email: { contains: `wishlist-api-${runId}` } } },
    });
    await db.outbox.deleteMany({ where: { aggregateType: 'wishlistItem' } });
    await db.user.deleteMany({ where: { email: { contains: `wishlist-api-${runId}` } } });
    await disconnectDb();
  });

  async function create(tok = token): Promise<string> {
    const res = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${tok}`)
      .send({ keywords: ['sofa'], maxDistanceKm: 10, listingTypePreference: 'giveaway' });
    return (res.body as { id: string }).id;
  }

  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/wishlists');
    expect(res.status).toBe(401);
  });

  it('POST then GET returns the caller wishlist', async () => {
    const id = await create();
    expect(id).toBeTruthy();

    const res = await request(app)
      .get('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect((res.body as { id: string }[]).some((i) => i.id === id)).toBe(true);
  });

  it('rejects an invalid create body', async () => {
    const res = await request(app)
      .post('/api/v1/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({ keywords: ['sofa'] }); // missing maxDistanceKm
    expect(res.status).toBe(400);
  });

  it('PATCH updates; non-owner gets 403', async () => {
    const id = await create();

    const ok = await request(app)
      .patch(`/api/v1/wishlists/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paused' });
    expect(ok.status).toBe(200);
    expect((ok.body as { status: string }).status).toBe('paused');

    const forbidden = await request(app)
      .patch(`/api/v1/wishlists/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'active' });
    expect(forbidden.status).toBe(403);
  });

  it('DELETE removes the item', async () => {
    const id = await create();
    const del = await request(app)
      .delete(`/api/v1/wishlists/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it('400s on a malformed id', async () => {
    const res = await request(app)
      .patch('/api/v1/wishlists/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paused' });
    expect(res.status).toBe(400);
  });
});
