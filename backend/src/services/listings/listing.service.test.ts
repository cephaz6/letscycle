import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import { StorageService, createDummyStorage } from '../system/index.js';
import {
  confirmPhoto,
  createListing,
  createPhotoUpload,
  favouriteListing,
  getListing,
  removeListing,
  searchListings,
  seedCategories,
  unfavouriteListing,
  updateListing,
  viewListing,
} from './index.js';
import type { CreateListingInput, ListingLocation } from './listing.types.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const LIVERPOOL = {
  lat: 53.4084,
  lng: -2.9916,
  accuracyMetres: 500,
} satisfies ListingLocation;
const LONDON = {
  lat: 51.5074,
  lng: -0.1278,
  accuracyMetres: 500,
} satisfies ListingLocation;

describe.skipIf(!hasDb)('listings service', () => {
  const storage = new StorageService(createDummyStorage(), 'test-bucket', getDb());
  let sellerId: string;
  let otherId: string;
  let categoryId: string;
  let otherCategoryId: string;
  const listingIds: string[] = [];

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `listings-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Listing Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    return user.id;
  }

  async function make(overrides: Partial<CreateListingInput> = {}): Promise<string> {
    const listing = await createListing({
      sellerId,
      title: 'Vintage oak dining table',
      description: 'Solid oak, seats six, great condition',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: 12000,
      location: LIVERPOOL,
      publish: true,
      ...overrides,
    });
    listingIds.push(listing.id);
    return listing.id;
  }

  beforeAll(async () => {
    await seedCategories(getDb());
    const categories = await getDb().category.findMany({
      select: { id: true },
      take: 2,
    });
    categoryId = categories[0]!.id;
    otherCategoryId = categories[1]!.id;
    sellerId = await makeUser();
    otherId = await makeUser();
  });

  afterAll(async () => {
    const db = getDb();
    await db.favourite.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.listingView.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.listingPhoto.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.s3Object.deleteMany({ where: { ownerUserId: { in: [sellerId, otherId] } } });
    await db.outbox.deleteMany({ where: { aggregateId: { in: listingIds } } });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.user.deleteMany({ where: { email: { contains: `listings-${runId}` } } });
    await disconnectDb();
  });

  describe('create', () => {
    it('creates a draft without emitting an event and round-trips location', async () => {
      const listing = await createListing({
        sellerId,
        title: 'Draft item',
        description: 'still deciding',
        categoryId,
        condition: 'good',
        listingType: 'sell',
        pricePence: 5000,
        location: LIVERPOOL,
      });
      listingIds.push(listing.id);

      expect(listing.status).toBe('draft');
      expect(listing.publishedAt).toBeNull();
      expect(listing.location.lat).toBeCloseTo(LIVERPOOL.lat, 4);
      expect(listing.location.lng).toBeCloseTo(LIVERPOOL.lng, 4);
      expect(listing.location.accuracyMetres).toBe(500);

      const events = await getDb().outbox.findMany({
        where: { aggregateId: listing.id },
      });
      expect(events).toHaveLength(0);
    });

    it('publishes on create and emits listing.created', async () => {
      const id = await make();

      const events = await getDb().outbox.findMany({ where: { aggregateId: id } });
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('listing.created');
      expect(events[0]?.payload).toMatchObject({ listingId: id, sellerId });
    });

    it('forces giveaway price to null', async () => {
      const listing = await createListing({
        sellerId,
        title: 'Free books',
        description: 'box of paperbacks',
        categoryId,
        condition: 'fair',
        listingType: 'giveaway',
        pricePence: 999,
        location: LIVERPOOL,
      });
      listingIds.push(listing.id);
      expect(listing.pricePence).toBeNull();
    });

    it('rejects a sell listing without a positive price', async () => {
      await expect(
        createListing({
          sellerId,
          title: 'No price',
          description: 'oops',
          categoryId,
          condition: 'good',
          listingType: 'sell',
          pricePence: null,
          location: LIVERPOOL,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects an unknown category', async () => {
      await expect(
        createListing({
          sellerId,
          title: 'Bad category',
          description: 'oops',
          categoryId: randomUUID(),
          condition: 'good',
          listingType: 'sell',
          pricePence: 100,
          location: LIVERPOOL,
        }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('read & view', () => {
    it('records a listingView on view', async () => {
      const id = await make();
      await viewListing(id, otherId, 'search');

      const views = await getDb().listingView.count({ where: { listingId: id } });
      expect(views).toBe(1);
    });

    it('404s for a missing listing', async () => {
      await expect(getListing(randomUUID())).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('edits fields on an active listing and emits listing.updated', async () => {
      const id = await make();
      await getDb().outbox.deleteMany({ where: { aggregateId: id } });

      const updated = await updateListing(id, sellerId, { title: 'Updated title' });
      expect(updated.title).toBe('Updated title');

      const events = await getDb().outbox.findMany({ where: { aggregateId: id } });
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('listing.updated');
    });

    it('publishing a draft emits listing.created and sets publishedAt', async () => {
      const draft = await createListing({
        sellerId,
        title: 'To publish',
        description: 'ready soon',
        categoryId,
        condition: 'good',
        listingType: 'sell',
        pricePence: 3000,
        location: LIVERPOOL,
      });
      listingIds.push(draft.id);

      const published = await updateListing(draft.id, sellerId, { status: 'active' });
      expect(published.status).toBe('active');
      expect(published.publishedAt).not.toBeNull();

      const events = await getDb().outbox.findMany({ where: { aggregateId: draft.id } });
      expect(events.map((e) => e.eventType)).toContain('listing.created');
    });

    it('changing category is validated', async () => {
      const id = await make();
      const updated = await updateListing(id, sellerId, { categoryId: otherCategoryId });
      expect(updated.categoryId).toBe(otherCategoryId);

      await expect(
        updateListing(id, sellerId, { categoryId: randomUUID() }),
      ).rejects.toThrow(BadRequestError);
    });

    it('forbids a non-owner from editing', async () => {
      const id = await make();
      await expect(updateListing(id, otherId, { title: 'hijack' })).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('remove', () => {
    it('soft-removes and emits listing.removed', async () => {
      const id = await make();
      await getDb().outbox.deleteMany({ where: { aggregateId: id } });

      await removeListing(id, sellerId);
      const listing = await getListing(id);
      expect(listing.status).toBe('removed');

      const events = await getDb().outbox.findMany({ where: { aggregateId: id } });
      expect(events[0]?.eventType).toBe('listing.removed');
    });

    it('forbids a non-owner from removing', async () => {
      const id = await make();
      await expect(removeListing(id, otherId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('search', () => {
    it('filters by distance from a center point', async () => {
      const near = await make({ title: `near ${runId}` });
      const far = await make({ title: `far ${runId}`, location: LONDON });

      const result = await searchListings({
        center: { lat: LIVERPOOL.lat, lng: LIVERPOOL.lng },
        radiusKm: 50,
        sort: 'distance',
        limit: 50,
        offset: 0,
      });
      const ids = result.items.map((i) => i.id);
      expect(ids).toContain(near);
      expect(ids).not.toContain(far);

      const nearItem = result.items.find((i) => i.id === near);
      expect(nearItem?.distanceMetres).toBeGreaterThanOrEqual(0);
    });

    it('filters by keyword using full-text search', async () => {
      const match = await make({
        title: `Herringbone bicycle ${runId}`,
        description: 'a distinctive keyword xylophonic',
      });

      const result = await searchListings({
        keyword: 'xylophonic',
        sort: 'relevance',
        limit: 50,
        offset: 0,
      });
      expect(result.items.map((i) => i.id)).toContain(match);
    });

    it('filters by listingType and excludes non-active listings', async () => {
      const giveaway = await make({
        title: `giveaway ${runId}`,
        listingType: 'giveaway',
        pricePence: null,
      });
      const removed = await make({ title: `removed ${runId}` });
      await removeListing(removed, sellerId);

      const result = await searchListings({
        listingType: 'giveaway',
        sort: 'recent',
        limit: 50,
        offset: 0,
      });
      const ids = result.items.map((i) => i.id);
      expect(ids).toContain(giveaway);
      expect(ids).not.toContain(removed);
      expect(result.items.every((i) => i.status === 'active')).toBe(true);
    });
  });

  describe('photos (two-step)', () => {
    it('hides a photo until it is confirmed', async () => {
      const id = await make();

      const upload = await createPhotoUpload(storage, id, sellerId, {
        contentType: 'image/jpeg',
        sizeBytes: 2048,
        width: 800,
        height: 600,
        displayOrder: 0,
      });
      expect(upload.uploadUrl).toContain('http');

      // Pending — not visible yet.
      let listing = await getListing(id);
      expect(listing.photos).toHaveLength(0);

      await confirmPhoto(storage, id, upload.photoId, sellerId);
      listing = await getListing(id);
      expect(listing.photos).toHaveLength(1);
      expect(listing.photos[0]?.key).toBe(upload.key);
    });

    it('forbids adding a photo to someone else’s listing', async () => {
      const id = await make();
      await expect(
        createPhotoUpload(storage, id, otherId, {
          contentType: 'image/png',
          sizeBytes: 1024,
          width: 100,
          height: 100,
          displayOrder: 0,
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('favourites', () => {
    it('adds and removes a favourite idempotently', async () => {
      const id = await make();

      await favouriteListing(otherId, id);
      await favouriteListing(otherId, id);
      expect(
        await getDb().favourite.count({ where: { userId: otherId, listingId: id } }),
      ).toBe(1);

      await unfavouriteListing(otherId, id);
      expect(
        await getDb().favourite.count({ where: { userId: otherId, listingId: id } }),
      ).toBe(0);
    });

    it('404s when favouriting a missing listing', async () => {
      await expect(favouriteListing(otherId, randomUUID())).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
