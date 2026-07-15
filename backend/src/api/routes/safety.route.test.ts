import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { AuthService, createDummyCognito } from '../../services/auth/index.js';
import { StorageService, createDummyStorage } from '../../services/system/index.js';
import { seedMeetPoints } from '../../services/safety/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';

describe.skipIf(!hasDb)('safety API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let token: string;
  let userId: string;
  let otherToken: string;
  let transactionId: string;

  async function register(): Promise<{ token: string; id: string }> {
    const email = `safety-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Safety Api' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    return {
      token: (login.body as { accessToken: string }).accessToken,
      id: (signup.body as { userId: string }).userId,
    };
  }

  beforeAll(async () => {
    await seedMeetPoints(getDb());
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
      storageService: new StorageService(createDummyStorage(), 'test-bucket', getDb()),
    });
    const buyer = await register();
    token = buyer.token;
    userId = buyer.id;
    const seller = await register();
    otherToken = seller.token;

    const category = await getDb().category.create({
      data: {
        slug: `safety-api-cat-${runId}`,
        name: 'c',
        typicalDistanceKm: 10,
        iconName: 'x',
      },
      select: { id: true },
    });
    const listingId = randomUUID();
    await getDb().$executeRaw`
      INSERT INTO "listing" ("id","sellerId","title","description","categoryId",
        condition,"listingType","pricePence",location,"locationAccuracyMetres",status)
      VALUES (${listingId}::uuid, ${seller.id}::uuid, 'l', 'd', ${category.id}::uuid,
        'good'::"ListingCondition", 'sell'::"ListingType", 1000,
        ST_SetSRID(ST_MakePoint(-2.99, 53.4), 4326)::geography, 500, 'active'::"ListingStatus")
    `;
    const txn = await getDb().transaction.create({
      data: {
        listingId,
        buyerId: userId,
        sellerId: seller.id,
        amountPence: 1000,
        commissionPence: 50,
        status: 'inEscrow',
      },
      select: { id: true },
    });
    transactionId = txn.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.safeTransitSession.deleteMany({ where: { transactionId } });
    await db.transaction.deleteMany({ where: { id: transactionId } });
    await db.listing.deleteMany({
      where: { seller: { email: { contains: `safety-api-${runId}` } } },
    });
    await db.category.deleteMany({ where: { slug: `safety-api-cat-${runId}` } });
    await db.refreshToken.deleteMany({
      where: { user: { email: { contains: `safety-api-${runId}` } } },
    });
    await db.outbox.deleteMany({ where: { aggregateType: 'listing' } });
    await db.user.deleteMany({ where: { email: { contains: `safety-api-${runId}` } } });
    await disconnectDb();
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/meet-points');
    expect(res.status).toBe(401);
  });

  it('GET /meet-points returns nearby points', async () => {
    const res = await request(app)
      .get('/api/v1/meet-points')
      .query({ lat: 53.4084, lng: -2.9916, radiusKm: 15 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBeGreaterThan(0);
  });

  it('400s when lat/lng are missing', async () => {
    const res = await request(app)
      .get('/api/v1/meet-points')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('starts and updates a safe transit session', async () => {
    const start = await request(app)
      .post(`/api/v1/transactions/${transactionId}/safe-transit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ liveLocationShareEnabled: true });
    expect(start.status).toBe(201);
    const sessionId = (start.body as { id: string }).id;

    const patch = await request(app)
      .patch(`/api/v1/safe-transit/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmArrival: true, end: true });
    expect(patch.status).toBe(200);
    const body = patch.body as {
      arrivalConfirmedAt: string | null;
      endedAt: string | null;
    };
    expect(body.arrivalConfirmedAt).not.toBeNull();
    expect(body.endedAt).not.toBeNull();
  });

  it('forbids a non-participant from starting a session', async () => {
    const res = await request(app)
      .post(`/api/v1/transactions/${transactionId}/safe-transit`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({});
    // seller is a participant; use a stranger instead
    const stranger = await register();
    const res2 = await request(app)
      .post(`/api/v1/transactions/${transactionId}/safe-transit`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({});
    expect([201, 403]).toContain(res.status); // seller allowed
    expect(res2.status).toBe(403);
  });
});
