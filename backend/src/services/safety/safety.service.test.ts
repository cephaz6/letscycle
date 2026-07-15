import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import {
  listNearbyMeetPoints,
  seedMeetPoints,
  startSafeTransit,
  updateSafeTransit,
} from './index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
// Liverpool city centre.
const CENTRE = { lat: 53.4084, lng: -2.9916 };

describe.skipIf(!hasDb)('safety service', () => {
  let buyerId: string;
  let sellerId: string;
  let strangerId: string;
  let transactionId: string;

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `safety-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Safety Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    return user.id;
  }

  beforeAll(async () => {
    await seedMeetPoints(getDb());
    buyerId = await makeUser();
    sellerId = await makeUser();
    strangerId = await makeUser();
    // A minimal transaction (no listing needed for the participant check path;
    // use a listing to satisfy the FK).
    const category = await getDb().category.create({
      data: {
        slug: `safety-cat-${runId}`,
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
      VALUES (${listingId}::uuid, ${sellerId}::uuid, 'Safety listing', 'd', ${category.id}::uuid,
        'good'::"ListingCondition", 'sell'::"ListingType", 1000,
        ST_SetSRID(ST_MakePoint(-2.99, 53.4), 4326)::geography, 500, 'active'::"ListingStatus")
    `;
    const txn = await getDb().transaction.create({
      data: {
        listingId,
        buyerId,
        sellerId,
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
    const ids = [buyerId, sellerId, strangerId];
    await db.safeTransitSession.deleteMany({ where: { userId: { in: ids } } });
    await db.transaction.deleteMany({ where: { id: transactionId } });
    await db.listing.deleteMany({ where: { sellerId: { in: ids } } });
    await db.category.deleteMany({ where: { slug: `safety-cat-${runId}` } });
    await db.outbox.deleteMany({ where: { aggregateType: 'listing' } });
    await db.user.deleteMany({ where: { email: { contains: `safety-${runId}` } } });
    await disconnectDb();
  });

  describe('meet points', () => {
    it('seeding is idempotent', async () => {
      const before = await getDb().meetPoint.count();
      await seedMeetPoints(getDb());
      expect(await getDb().meetPoint.count()).toBe(before);
    });

    it('returns verified meet points near a point, nearest first', async () => {
      const points = await listNearbyMeetPoints({
        ...CENTRE,
        radiusKm: 15,
        limit: 10,
      });
      expect(points.length).toBeGreaterThan(0);
      // Distances are ascending.
      const distances = points.map((p) => p.distanceMetres ?? 0);
      expect([...distances].sort((a, b) => a - b)).toEqual(distances);
      expect(points[0]).toHaveProperty('category');
      expect(points[0]?.location).toHaveProperty('lat');
    });

    it('excludes points beyond the radius', async () => {
      const tight = await listNearbyMeetPoints({ ...CENTRE, radiusKm: 1, limit: 10 });
      const wide = await listNearbyMeetPoints({ ...CENTRE, radiusKm: 30, limit: 50 });
      expect(wide.length).toBeGreaterThanOrEqual(tight.length);
    });
  });

  describe('safe transit', () => {
    it('a participant starts a session', async () => {
      const session = await startSafeTransit(transactionId, buyerId, {
        liveLocationShareEnabled: true,
      });
      expect(session.userId).toBe(buyerId);
      expect(session.liveLocationShareEnabled).toBe(true);
      expect(session.endedAt).toBeNull();
    });

    it('forbids a non-participant', async () => {
      await expect(startSafeTransit(transactionId, strangerId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('404s for an unknown transaction', async () => {
      await expect(startSafeTransit(randomUUID(), buyerId, {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it('owner updates arrival, duress, then ends the session', async () => {
      const session = await startSafeTransit(transactionId, sellerId, {});

      const arrived = await updateSafeTransit(session.id, sellerId, {
        confirmArrival: true,
        trustedContactNotified: true,
      });
      expect(arrived.arrivalConfirmedAt).not.toBeNull();
      expect(arrived.trustedContactNotified).toBe(true);

      const duress = await updateSafeTransit(session.id, sellerId, {
        triggerDuress: true,
      });
      expect(duress.duressTriggeredAt).not.toBeNull();

      const ended = await updateSafeTransit(session.id, sellerId, { end: true });
      expect(ended.endedAt).not.toBeNull();

      // No updates after ending.
      await expect(
        updateSafeTransit(session.id, sellerId, { confirmArrival: true }),
      ).rejects.toThrow(BadRequestError);
    });

    it('forbids updating someone else’s session', async () => {
      const session = await startSafeTransit(transactionId, buyerId, {});
      await expect(
        updateSafeTransit(session.id, strangerId, { end: true }),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
