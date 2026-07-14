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

describe.skipIf(!hasDb)('trust API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let buyerToken: string;
  let buyerId: string;
  let sellerId: string;
  let categoryId: string;

  async function register(): Promise<{ token: string; id: string }> {
    const email = `trust-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Trust Api' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    return {
      token: (login.body as { accessToken: string }).accessToken,
      id: (signup.body as { userId: string }).userId,
    };
  }

  beforeAll(async () => {
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
      storageService: new StorageService(createDummyStorage(), 'test-bucket', getDb()),
    });
    const buyer = await register();
    buyerToken = buyer.token;
    buyerId = buyer.id;
    const seller = await register();
    sellerId = seller.id;
    const cat = await getDb().category.create({
      data: {
        slug: `trust-api-cat-${runId}`,
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
    const users = [buyerId, sellerId];
    const listings = await db.listing.findMany({
      where: { sellerId: { in: users } },
      select: { id: true },
    });
    const listingIds = listings.map((l) => l.id);
    await db.review.deleteMany({ where: { revieweeUserId: { in: users } } });
    await db.flag.deleteMany({ where: { reporterUserId: { in: users } } });
    await db.trustEvent.deleteMany({ where: { userId: { in: users } } });
    await db.trustScore.deleteMany({ where: { userId: { in: users } } });
    await db.transaction.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.refreshToken.deleteMany({
      where: { user: { email: { contains: `trust-api-${runId}` } } },
    });
    await db.outbox.deleteMany({
      where: { aggregateType: { in: ['review', 'flag', 'listing'] } },
    });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.user.deleteMany({ where: { email: { contains: `trust-api-${runId}` } } });
    await disconnectDb();
  });

  async function completedTxn(): Promise<string> {
    const listing = await createListing({
      sellerId,
      title: 'Oak table',
      description: 'nice',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: 10000,
      location: L,
      publish: true,
    });
    const txn = await getDb().transaction.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId,
        amountPence: 10000,
        commissionPence: 500,
        status: 'completed',
        completedAt: new Date(),
      },
      select: { id: true },
    });
    return txn.id;
  }

  it('requires auth', async () => {
    const res = await request(app).post('/api/v1/reviews').send({});
    expect(res.status).toBe(401);
  });

  it('POST /reviews submits a review', async () => {
    const transactionId = await completedTxn();
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ transactionId, rating: 5, comment: 'Great' });

    expect(res.status).toBe(201);
    expect((res.body as { revieweeUserId: string }).revieweeUserId).toBe(sellerId);
  });

  it('rejects an out-of-range rating', async () => {
    const transactionId = await completedTxn();
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ transactionId, rating: 9 });
    expect(res.status).toBe(400);
  });

  it('POST /flags raises a flag', async () => {
    const res = await request(app)
      .post('/api/v1/flags')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        targetType: 'listing',
        targetId: randomUUID(),
        reason: 'prohibited',
        description: 'counterfeit',
      });
    expect(res.status).toBe(201);
    expect((res.body as { status: string }).status).toBe('open');
  });

  it('rejects an invalid flag body', async () => {
    const res = await request(app)
      .post('/api/v1/flags')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ targetType: 'planet', targetId: randomUUID(), reason: 'x' });
    expect(res.status).toBe(400);
  });
});
