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

describe.skipIf(!hasDb)('conversations API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let buyerToken: string;
  let buyerId: string;
  let sellerId: string;
  let categoryId: string;
  let listingId: string;

  async function register(): Promise<{ token: string; id: string }> {
    const email = `conv-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Conv Api' });
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
        slug: `conv-cat-${runId}`,
        name: 'Conv Cat',
        typicalDistanceKm: 10,
        iconName: 'x',
      },
      select: { id: true },
    });
    categoryId = cat.id;
    const listing = await createListing({
      sellerId,
      title: 'Oak table',
      description: 'nice',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: 5000,
      location: L,
      publish: true,
    });
    listingId = listing.id;
  });

  afterAll(async () => {
    const db = getDb();
    const ids = [buyerId, sellerId];
    const convos = await db.conversation.findMany({
      where: { OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] },
      select: { id: true },
    });
    const convoIds = convos.map((c) => c.id);
    await db.message.deleteMany({ where: { conversationId: { in: convoIds } } });
    await db.conversation.deleteMany({ where: { id: { in: convoIds } } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.matchCandidate.deleteMany({ where: { listingId } });
    await db.matchEvent.deleteMany({ where: { listingId } });
    await db.outbox.deleteMany({
      where: { aggregateType: { in: ['message', 'listing'] } },
    });
    await db.listing.deleteMany({ where: { id: listingId } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { email: { contains: `conv-api-${runId}` } } });
    await disconnectDb();
  });

  const bearer = () => `Bearer ${buyerToken}`;

  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/conversations');
    expect(res.status).toBe(401);
  });

  it('POST /conversations starts a conversation', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', bearer())
      .send({ listingId });

    expect(res.status).toBe(201);
    const body = res.body as { id: string; buyerId: string; sellerId: string };
    expect(body.buyerId).toBe(buyerId);
    expect(body.sellerId).toBe(sellerId);
  });

  it('sends and lists messages', async () => {
    const start = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', bearer())
      .send({ listingId });
    const conversationId = (start.body as { id: string }).id;

    const send = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', bearer())
      .send({ body: 'Hello!' });
    expect(send.status).toBe(201);
    expect((send.body as { body: string }).body).toBe('Hello!');

    const list = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', bearer());
    expect(list.status).toBe(200);
    const body = list.body as { items: { body: string }[]; total: number };
    expect(body.items.some((m) => m.body === 'Hello!')).toBe(true);
  });

  it('rejects an empty message body', async () => {
    const start = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', bearer())
      .send({ listingId });
    const conversationId = (start.body as { id: string }).id;

    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', bearer())
      .send({ body: '   ' });
    expect(res.status).toBe(400);
  });

  it('GET /conversations lists the caller conversations', async () => {
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('400s on a malformed conversation id', async () => {
    const res = await request(app)
      .get('/api/v1/conversations/not-a-uuid/messages')
      .set('Authorization', bearer());
    expect(res.status).toBe(400);
  });
});
