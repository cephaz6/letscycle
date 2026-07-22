import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { InProcessEventBus } from '../../shared/events/bus.js';
import type { AppEvent } from '../../shared/events/schemas.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/httpErrors.js';
import { seedDefaultSiteSettings } from '../system/index.js';
import { createListing } from '../listings/index.js';
import { createWishlistItem } from '../wishlists/index.js';
import { computeCandidatesForListing, expressInterest } from './matching.service.js';
import { registerMatchingHandlers } from './handlers.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const L = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 }; // Liverpool

describe.skipIf(!hasDb)('matching service', () => {
  let sellerId: string;
  let categoryId: string;
  let otherCategoryId: string;
  const userIds: string[] = [];
  const listingIds: string[] = [];

  async function makeUser(home?: { lat: number; lng: number }): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `matching-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Matching Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    userIds.push(user.id);
    if (home) {
      await getDb().$executeRaw`
        UPDATE "user"
        SET "homeLocation" = ST_SetSRID(ST_MakePoint(${home.lng}, ${home.lat}), 4326)::geography,
            "homeLocationAccuracyMetres" = 500
        WHERE id = ${user.id}::uuid
      `;
    }
    return user.id;
  }

  async function makeListing(overrides = {}): Promise<string> {
    const listing = await createListing({
      sellerId,
      title: 'Vintage oak dining table',
      description: 'Solid oak, seats six',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: 10000,
      location: L,
      publish: true,
      ...overrides,
    });
    listingIds.push(listing.id);
    return listing.id;
  }

  async function makeWish(userId: string, overrides = {}): Promise<string> {
    const item = await createWishlistItem({
      userId,
      categoryId,
      keywords: ['oak', 'table'],
      maxPricePence: 20000,
      maxDistanceKm: 15,
      listingTypePreference: 'both',
      ...overrides,
    });
    return item.id;
  }

  beforeAll(async () => {
    await seedDefaultSiteSettings(getDb());
    // Dedicated categories unique to this run so only this suite's wishlists
    // can match its listings — isolates the global candidate query from any
    // other (or leftover) data in the shared database.
    const cat = await getDb().category.create({
      data: {
        slug: `match-cat-${runId}`,
        name: 'Match Cat',
        typicalDistanceKm: 15,
        iconName: 'x',
      },
      select: { id: true },
    });
    const other = await getDb().category.create({
      data: {
        slug: `match-other-${runId}`,
        name: 'Other Cat',
        typicalDistanceKm: 15,
        iconName: 'x',
      },
      select: { id: true },
    });
    categoryId = cat.id;
    otherCategoryId = other.id;
    sellerId = await makeUser();
  });

  afterAll(async () => {
    const db = getDb();
    await db.matchCandidate.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.matchEvent.deleteMany({ where: { listingId: { in: listingIds } } });
    // Notifications FK to users; clear any the notification handler produced.
    await db.notification.deleteMany({ where: { userId: { in: userIds } } });
    await db.wishlistItem.deleteMany({ where: { userId: { in: userIds } } });
    await db.outbox.deleteMany({
      where: { aggregateId: { in: [...listingIds, ...userIds] } },
    });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    // Tie the cleanup to the same predicate as the delete below, so a
    // notification for an untracked user can't block it.
    await db.notification.deleteMany({
      where: { user: { email: { contains: `matching-${runId}` } } },
    });
    await db.notificationPreference.deleteMany({
      where: { user: { email: { contains: `matching-${runId}` } } },
    });
    await db.user.deleteMany({ where: { email: { contains: `matching-${runId}` } } });
    await db.category.deleteMany({
      where: { id: { in: [categoryId, otherCategoryId] } },
    });
    await disconnectDb();
  });

  describe('computeCandidatesForListing', () => {
    it('matches eligible buyers, ranks by score, and emits match.candidatesFound', async () => {
      const near = await makeUser({ lat: L.lat, lng: L.lng });
      const mid = await makeUser({ lat: 53.435, lng: -2.9916 }); // ~3km north
      await makeWish(near);
      await makeWish(mid);

      const listingId = await makeListing();
      const result = await computeCandidatesForListing(listingId);
      expect(result.candidateCount).toBeGreaterThanOrEqual(2);

      const candidates = await getDb().matchCandidate.findMany({
        where: { listingId },
        orderBy: { rank: 'asc' },
      });
      const ids = candidates.map((c) => c.userId);
      expect(ids).toContain(near);
      expect(ids).toContain(mid);
      // Closer buyer ranks ahead of the farther one.
      expect(ids.indexOf(near)).toBeLessThan(ids.indexOf(mid));
      expect(candidates[0]?.status).toBe('notified');
      const nearScore = candidates.find((c) => c.userId === near)!.proximityScore;
      const midScore = candidates.find((c) => c.userId === mid)!.proximityScore;
      expect(nearScore).toBeGreaterThan(midScore);

      const emitted = await getDb().outbox.findMany({
        where: { aggregateId: listingId, eventType: 'match.candidatesFound' },
      });
      expect(emitted).toHaveLength(1);
      expect(
        (emitted[0]?.payload as { matchCandidateIds: string[] }).matchCandidateIds.length,
      ).toBeGreaterThanOrEqual(2);

      const matchEvents = await getDb().matchEvent.findMany({ where: { listingId } });
      expect(matchEvents.some((e) => e.eventType === 'candidatesComputed')).toBe(true);
    });

    it('excludes ineligible wishlists', async () => {
      const tooFar = await makeUser({ lat: 51.5074, lng: -0.1278 }); // London
      const wrongCat = await makeUser({ lat: L.lat, lng: L.lng });
      const tooPricey = await makeUser({ lat: L.lat, lng: L.lng });
      const giveawayOnly = await makeUser({ lat: L.lat, lng: L.lng });
      const eligible = await makeUser({ lat: L.lat, lng: L.lng });

      await makeWish(tooFar); // beyond 15km radius
      await makeWish(wrongCat, { categoryId: otherCategoryId });
      await makeWish(tooPricey, { maxPricePence: 5000 }); // < 10000 listing price
      await makeWish(giveawayOnly, { listingTypePreference: 'giveaway' });
      await makeWish(sellerId); // seller's own wishlist
      await makeWish(eligible);

      const listingId = await makeListing();
      await computeCandidatesForListing(listingId);

      const matchedUsers = (
        await getDb().matchCandidate.findMany({
          where: { listingId },
          select: { userId: true },
        })
      ).map((c) => c.userId);

      expect(matchedUsers).toContain(eligible);
      expect(matchedUsers).not.toContain(tooFar);
      expect(matchedUsers).not.toContain(wrongCat);
      expect(matchedUsers).not.toContain(tooPricey);
      expect(matchedUsers).not.toContain(giveawayOnly);
      expect(matchedUsers).not.toContain(sellerId);
    });

    it('matches a category-agnostic wishlist and respects giveaway pricing', async () => {
      const anyCat = await makeUser({ lat: L.lat, lng: L.lng });
      await makeWish(anyCat, { categoryId: null, listingTypePreference: 'giveaway' });

      const listingId = await makeListing({ listingType: 'giveaway', pricePence: null });
      await computeCandidatesForListing(listingId);

      const matched = await getDb().matchCandidate.findMany({ where: { listingId } });
      expect(matched.map((c) => c.userId)).toContain(anyCat);
    });

    it('honours topN from site settings', async () => {
      for (let i = 0; i < 3; i++) {
        await makeWish(await makeUser({ lat: L.lat, lng: L.lng }));
      }
      await getDb().siteSetting.update({
        where: { key: 'matching.topN' },
        data: { value: 2 },
      });

      const listingId = await makeListing();
      const result = await computeCandidatesForListing(listingId);
      expect(result.candidateCount).toBe(2);

      await getDb().siteSetting.update({
        where: { key: 'matching.topN' },
        data: { value: 10 },
      });
    });

    it('is idempotent on re-delivery', async () => {
      await makeWish(await makeUser({ lat: L.lat, lng: L.lng }));
      const listingId = await makeListing();

      await computeCandidatesForListing(listingId);
      const first = await getDb().matchCandidate.count({ where: { listingId } });
      await computeCandidatesForListing(listingId);
      const second = await getDb().matchCandidate.count({ where: { listingId } });

      expect(second).toBe(first);
    });
  });

  describe('listing.created handler', () => {
    it('computes candidates when the event fires', async () => {
      const buyer = await makeUser({ lat: L.lat, lng: L.lng });
      await makeWish(buyer);
      const listingId = await makeListing();

      const bus = new InProcessEventBus(() => {});
      registerMatchingHandlers(bus);
      const event: AppEvent<'listing.created'> = {
        eventId: randomUUID(),
        occurredAt: new Date(),
        eventType: 'listing.created',
        aggregateType: 'listing',
        aggregateId: listingId,
        payload: { listingId, sellerId },
      };
      await bus.publish(event);

      const count = await getDb().matchCandidate.count({ where: { listingId } });
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('expressInterest', () => {
    let candidateId: string;
    let buyerId: string;

    beforeEach(async () => {
      const newBuyer = await makeUser({ lat: L.lat, lng: L.lng });
      await makeWish(newBuyer);
      const listingId = await makeListing();
      await computeCandidatesForListing(listingId);
      // Many prior buyers sit at the same point with identical scores, so the
      // exact top-N membership is arbitrary — drive the test from whichever
      // candidate the engine actually produced for this listing.
      const candidate = await getDb().matchCandidate.findFirstOrThrow({
        where: { listingId },
        orderBy: { rank: 'asc' },
        select: { id: true, userId: true },
      });
      candidateId = candidate.id;
      buyerId = candidate.userId;
    });

    it('lets the matched buyer express interest and emits the event', async () => {
      const result = await expressInterest(candidateId, buyerId);
      expect(result.status).toBe('interested');

      const row = await getDb().matchCandidate.findUnique({ where: { id: candidateId } });
      expect(row?.status).toBe('interested');
      expect(row?.expressedInterestAt).not.toBeNull();

      const emitted = await getDb().outbox.findMany({
        where: { aggregateId: candidateId, eventType: 'match.interestExpressed' },
      });
      expect(emitted).toHaveLength(1);
    });

    it('is idempotent', async () => {
      await expressInterest(candidateId, buyerId);
      await expect(expressInterest(candidateId, buyerId)).resolves.toMatchObject({
        status: 'interested',
      });
    });

    it('forbids a non-matched user', async () => {
      const stranger = await makeUser();
      await expect(expressInterest(candidateId, stranger)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('404s for an unknown candidate', async () => {
      await expect(expressInterest(randomUUID(), buyerId)).rejects.toThrow(NotFoundError);
    });
  });
});
