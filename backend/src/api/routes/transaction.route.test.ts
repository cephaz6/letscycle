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
import { createListing } from '../../services/listings/index.js';
import {
  PayoutService,
  TransactionService,
  createDummyPaymentGateway,
} from '../../services/transactions/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';
const L = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 };

describe.skipIf(!hasDb)('transactions API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let buyerToken: string;
  let buyerId: string;
  let sellerToken: string;
  let sellerId: string;
  let categoryId: string;

  async function register(): Promise<{ token: string; id: string }> {
    const email = `txn-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Txn Api' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    return {
      token: (login.body as { accessToken: string }).accessToken,
      id: (signup.body as { userId: string }).userId,
    };
  }

  async function newListing(): Promise<string> {
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
    return listing.id;
  }

  beforeAll(async () => {
    await seedDefaultSiteSettings(getDb());
    const gateway = createDummyPaymentGateway();
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
      storageService: new StorageService(createDummyStorage(), 'test-bucket', getDb()),
      transactionService: new TransactionService(gateway, getDb()),
      payoutService: new PayoutService(gateway, getDb()),
    });
    const buyer = await register();
    buyerToken = buyer.token;
    buyerId = buyer.id;
    const seller = await register();
    sellerToken = seller.token;
    sellerId = seller.id;
    const cat = await getDb().category.create({
      data: {
        slug: `txn-api-cat-${runId}`,
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
    const txns = await db.transaction.findMany({
      where: { listingId: { in: listingIds } },
      select: { id: true },
    });
    const txnIds = txns.map((t) => t.id);
    await db.transactionEvent.deleteMany({ where: { transactionId: { in: txnIds } } });
    await db.dispute.deleteMany({ where: { transactionId: { in: txnIds } } });
    await db.transaction.deleteMany({ where: { id: { in: txnIds } } });
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.payoutAccount.deleteMany({ where: { userId: { in: users } } });
    await db.refreshToken.deleteMany({
      where: { user: { email: { contains: `txn-api-${runId}` } } },
    });
    await db.outbox.deleteMany({
      where: { aggregateType: { in: ['transaction', 'listing'] } },
    });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.user.deleteMany({ where: { email: { contains: `txn-api-${runId}` } } });
    await disconnectDb();
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/transactions/me');
    expect(res.status).toBe(401);
  });

  it('POST /payouts/onboard and GET /payouts/status', async () => {
    const onboard = await request(app)
      .post('/api/v1/payouts/onboard')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(onboard.status).toBe(200);
    expect((onboard.body as { url: string }).url).toContain('http');

    const status = await request(app)
      .get('/api/v1/payouts/status')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(status.status).toBe(200);
    expect((status.body as { payoutsEnabled: boolean }).payoutsEnabled).toBe(true);
  });

  it('runs create → confirm → complete via the API', async () => {
    const listingId = await newListing();

    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId });
    expect(create.status).toBe(201);
    const txnId = (create.body as { id: string }).id;

    const confirm = await request(app)
      .post(`/api/v1/transactions/${txnId}/confirm`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(confirm.status).toBe(200);
    expect((confirm.body as { status: string }).status).toBe('paymentAuthorised');

    await request(app)
      .post(`/api/v1/transactions/${txnId}/complete`)
      .set('Authorization', `Bearer ${buyerToken}`);
    const complete = await request(app)
      .post(`/api/v1/transactions/${txnId}/complete`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect((complete.body as { status: string }).status).toBe('inEscrow');

    const me = await request(app)
      .get('/api/v1/transactions/me')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect((me.body as { id: string }[]).some((t) => t.id === txnId)).toBe(true);
  });

  it('POST /transactions/:id/dispute', async () => {
    const listingId = await newListing();
    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId });
    const txnId = (create.body as { id: string }).id;
    await request(app)
      .post(`/api/v1/transactions/${txnId}/confirm`)
      .set('Authorization', `Bearer ${sellerToken}`);

    const dispute = await request(app)
      .post(`/api/v1/transactions/${txnId}/dispute`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'notAsDescribed', description: 'broken leg' });
    expect(dispute.status).toBe(201);
    expect((dispute.body as { transaction: { status: string } }).transaction.status).toBe(
      'disputed',
    );
  });

  it('403s a non-party and 400s a malformed id', async () => {
    const listingId = await newListing();
    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId });
    const txnId = (create.body as { id: string }).id;

    const stranger = await register();
    const forbidden = await request(app)
      .get(`/api/v1/transactions/${txnId}`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(forbidden.status).toBe(403);

    const bad = await request(app)
      .get('/api/v1/transactions/not-a-uuid')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(bad.status).toBe(400);
  });
});
