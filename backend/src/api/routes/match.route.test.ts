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
import { createListing, seedCategories } from '../../services/listings/index.js';
import { createWishlistItem } from '../../services/wishlists/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';
const L = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 };

describe.skipIf(!hasDb)('matches API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let buyerToken: string;
  let buyerId: string;
  let sellerId: string;
  let categoryId: string;
  let candidateId: string;
  const listingIds: string[] = [];

  async function register(): Promise<{ token: string; id: string }> {
    const email = `match-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Match Api' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    return {
      token: (login.body as { accessToken: string }).accessToken,
      id: (signup.body as { userId: string }).userId,
    };
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

    const buyer = await register();
    buyerToken = buyer.token;
    buyerId = buyer.id;
    const seller = await register();
    sellerId = seller.id;

    await getDb().$executeRaw`
      UPDATE "user"
      SET "homeLocation" = ST_SetSRID(ST_MakePoint(${L.lng}, ${L.lat}), 4326)::geography,
          "homeLocationAccuracyMetres" = 500
      WHERE id = ${buyerId}::uuid
    `;
    const wish = await createWishlistItem({
      userId: buyerId,
      categoryId,
      keywords: ['oak'],
      maxDistanceKm: 15,
    });
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
    listingIds.push(listing.id);
    // Seed a candidate directly — this suite exercises the interest endpoint,
    // not the matching computation (covered by matching.service.test.ts).
    const candidate = await getDb().matchCandidate.create({
      data: {
        listingId: listing.id,
        wishlistItemId: wish.id,
        userId: buyerId,
        compositeScore: 0.9,
        proximityScore: 1,
        keywordScore: 0.5,
        trustScoreAtMatch: 0.5,
        urgencyScore: 0,
        rank: 1,
        status: 'notified',
        notifiedAt: new Date(),
      },
      select: { id: true },
    });
    candidateId = candidate.id;
  });

  afterAll(async () => {
    const db = getDb();
    const emails = `match-api-${runId}`;
    await db.matchCandidate.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.matchEvent.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.wishlistItem.deleteMany({ where: { userId: { in: [buyerId, sellerId] } } });
    await db.outbox.deleteMany({
      where: { aggregateId: { in: [...listingIds, candidateId] } },
    });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.refreshToken.deleteMany({
      where: { user: { email: { contains: emails } } },
    });
    await db.user.deleteMany({ where: { email: { contains: emails } } });
    await disconnectDb();
  });

  it('requires auth', async () => {
    const res = await request(app).post(`/api/v1/matches/${candidateId}/interest`);
    expect(res.status).toBe(401);
  });

  it('lets the matched buyer express interest', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${candidateId}/interest`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe('interested');
  });

  it('403s for a non-matched user', async () => {
    const stranger = await register();
    const res = await request(app)
      .post(`/api/v1/matches/${candidateId}/interest`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(res.status).toBe(403);
  });

  it('404s for an unknown candidate', async () => {
    const res = await request(app)
      .post(`/api/v1/matches/${randomUUID()}/interest`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(404);
  });

  it('400s for a malformed candidate id', async () => {
    const res = await request(app)
      .post('/api/v1/matches/not-a-uuid/interest')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(400);
  });
});
