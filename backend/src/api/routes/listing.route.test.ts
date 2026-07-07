import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { AuthService, createDummyCognito } from '../../services/auth/index.js';
import {
  StorageService,
  createDummyStorage,
  seedDefaultSiteSettings,
} from '../../services/system/index.js';
import { seedCategories } from '../../services/listings/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';
const LIVERPOOL = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 };

describe.skipIf(!hasDb)('listings API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let token: string;
  let otherToken: string;
  let userId: string;
  let categoryId: string;
  const listingIds: string[] = [];

  async function register(): Promise<{ token: string; id: string }> {
    const email = `listings-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Listings Api' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    return {
      token: (login.body as { accessToken: string }).accessToken,
      id: (signup.body as { userId: string }).userId,
    };
  }

  async function createPublished(tok = token): Promise<string> {
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${tok}`)
      .send({
        title: 'API oak table',
        description: 'seats six',
        categoryId,
        condition: 'good',
        listingType: 'sell',
        pricePence: 9000,
        location: LIVERPOOL,
        publish: true,
      });
    const id = (res.body as { id: string }).id;
    listingIds.push(id);
    return id;
  }

  beforeAll(async () => {
    await seedDefaultSiteSettings(getDb());
    await seedCategories(getDb());
    categoryId = (await getDb().category.findFirstOrThrow({ select: { id: true } })).id;

    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
      storageService: new StorageService(createDummyStorage(), 'test-bucket', getDb()),
    });

    const me = await register();
    token = me.token;
    userId = me.id;
    const other = await register();
    otherToken = other.token;
  });

  afterAll(async () => {
    const db = getDb();
    await db.favourite.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.listingView.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.listingPhoto.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.outbox.deleteMany({ where: { aggregateId: { in: listingIds } } });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.refreshToken.deleteMany({
      where: { user: { email: { contains: `listings-api-${runId}` } } },
    });
    await db.s3Object.deleteMany({ where: { ownerUserId: userId } });
    await db.outbox.deleteMany({ where: { aggregateId: userId } });
    await db.user.deleteMany({ where: { email: { contains: `listings-api-${runId}` } } });
    await disconnectDb();
  });

  it('GET /categories returns the seeded categories', async () => {
    const res = await request(app)
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBeGreaterThan(0);
  });

  it('requires auth to create a listing', async () => {
    const res = await request(app).post('/api/v1/listings').send({});
    expect(res.status).toBe(401);
  });

  it('POST /listings creates and returns a listing', async () => {
    const id = await createPublished();
    expect(id).toBeTruthy();

    const res = await request(app)
      .get(`/api/v1/listings/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe('active');
  });

  it('rejects an invalid create body', async () => {
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '',
        description: 'x',
        categoryId,
        condition: 'good',
        listingType: 'sell',
      });
    expect(res.status).toBe(400);
  });

  it('GET /listings searches with filters', async () => {
    await createPublished();
    const res = await request(app)
      .get('/api/v1/listings')
      .query({ lat: LIVERPOOL.lat, lng: LIVERPOOL.lng, radiusKm: 50, sort: 'distance' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const body = res.body as { items: unknown[]; total: number };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.total).toBeGreaterThan(0);
  });

  it('PATCH /listings/:id updates; non-owner gets 403', async () => {
    const id = await createPublished();

    const ok = await request(app)
      .patch(`/api/v1/listings/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renamed via API' });
    expect(ok.status).toBe(200);
    expect((ok.body as { title: string }).title).toBe('Renamed via API');

    const forbidden = await request(app)
      .patch(`/api/v1/listings/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'hijack' });
    expect(forbidden.status).toBe(403);
  });

  it('DELETE /listings/:id soft-removes', async () => {
    const id = await createPublished();
    const res = await request(app)
      .delete(`/api/v1/listings/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const after = await request(app)
      .get(`/api/v1/listings/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect((after.body as { status: string }).status).toBe('removed');
  });

  it('photo upload flow: presign then confirm', async () => {
    const id = await createPublished();

    const presign = await request(app)
      .post(`/api/v1/listings/${id}/photos`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: 4096,
        width: 800,
        height: 600,
        displayOrder: 0,
      });
    expect(presign.status).toBe(201);
    const { photoId, uploadUrl } = presign.body as { photoId: string; uploadUrl: string };
    expect(uploadUrl).toContain('http');

    const confirm = await request(app)
      .post(`/api/v1/listings/${id}/photos/${photoId}/confirm`)
      .set('Authorization', `Bearer ${token}`);
    expect(confirm.status).toBe(200);
    expect((confirm.body as { photos: unknown[] }).photos).toHaveLength(1);
  });

  it('favourite and unfavourite', async () => {
    const id = await createPublished();

    const fav = await request(app)
      .post(`/api/v1/listings/${id}/favourite`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(fav.status).toBe(204);

    const unfav = await request(app)
      .delete(`/api/v1/listings/${id}/favourite`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(unfav.status).toBe(204);
  });

  it('404s for an unknown listing and 400s for a malformed id', async () => {
    const notFound = await request(app)
      .get(`/api/v1/listings/${randomUUID()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(notFound.status).toBe(404);

    const bad = await request(app)
      .get('/api/v1/listings/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);
  });
});
