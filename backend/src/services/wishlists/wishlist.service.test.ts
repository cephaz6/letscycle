import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/httpErrors.js';
import { seedCategories } from '../listings/index.js';
import {
  createWishlistItem,
  deleteWishlistItem,
  listMyWishlist,
  updateWishlistItem,
} from './index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);

describe.skipIf(!hasDb)('wishlists service', () => {
  let userId: string;
  let otherId: string;
  let categoryId: string;
  const itemIds: string[] = [];

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `wishlist-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Wishlist Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    return user.id;
  }

  async function make(overrides = {}): Promise<string> {
    const item = await createWishlistItem({
      userId,
      keywords: ['oak', 'table'],
      maxPricePence: 20000,
      maxDistanceKm: 15,
      listingTypePreference: 'both',
      ...overrides,
    });
    itemIds.push(item.id);
    return item.id;
  }

  beforeAll(async () => {
    await seedCategories(getDb());
    categoryId = (await getDb().category.findFirstOrThrow({ select: { id: true } })).id;
    userId = await makeUser();
    otherId = await makeUser();
  });

  afterAll(async () => {
    const db = getDb();
    await db.outbox.deleteMany({ where: { aggregateId: { in: itemIds } } });
    await db.wishlistItem.deleteMany({ where: { userId: { in: [userId, otherId] } } });
    await db.user.deleteMany({ where: { email: { contains: `wishlist-${runId}` } } });
    await disconnectDb();
  });

  it('creates an item and emits wishlistItem.created', async () => {
    const id = await make({ categoryId });

    const item = await getDb().wishlistItem.findUnique({ where: { id } });
    expect(item?.status).toBe('active');
    expect(item?.categoryId).toBe(categoryId);

    const events = await getDb().outbox.findMany({ where: { aggregateId: id } });
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('wishlistItem.created');
    expect(events[0]?.payload).toMatchObject({ wishlistItemId: id, userId });
  });

  it('defaults preference to both and cleans blank keywords', async () => {
    const item = await createWishlistItem({
      userId,
      keywords: ['  bike ', '', '  '],
      maxDistanceKm: 10,
    });
    itemIds.push(item.id);

    expect(item.listingTypePreference).toBe('both');
    expect(item.keywords).toEqual(['bike']);
    expect(item.maxPricePence).toBeNull();
  });

  it('rejects an unknown category', async () => {
    await expect(
      createWishlistItem({ userId, maxDistanceKm: 10, categoryId: randomUUID() }),
    ).rejects.toThrow();
  });

  it('lists only the callers items, newest first', async () => {
    const mineA = await make();
    const mineB = await make();
    await createWishlistItem({ userId: otherId, maxDistanceKm: 10 }).then((i) =>
      itemIds.push(i.id),
    );

    const items = await listMyWishlist(userId);
    const ids = items.map((i) => i.id);
    expect(ids).toContain(mineA);
    expect(ids).toContain(mineB);
    expect(items.every((i) => i.userId === userId)).toBe(true);
    // newest first
    expect(ids.indexOf(mineB)).toBeLessThan(ids.indexOf(mineA));
  });

  it('updates fields and emits wishlistItem.updated', async () => {
    const id = await make();
    await getDb().outbox.deleteMany({ where: { aggregateId: id } });

    const updated = await updateWishlistItem(id, userId, {
      status: 'paused',
      maxPricePence: 5000,
    });
    expect(updated.status).toBe('paused');
    expect(updated.maxPricePence).toBe(5000);

    const events = await getDb().outbox.findMany({ where: { aggregateId: id } });
    expect(events[0]?.eventType).toBe('wishlistItem.updated');
  });

  it('forbids editing or deleting another users item', async () => {
    const id = await make();
    await expect(updateWishlistItem(id, otherId, { status: 'paused' })).rejects.toThrow(
      ForbiddenError,
    );
    await expect(deleteWishlistItem(id, otherId)).rejects.toThrow(ForbiddenError);
  });

  it('deletes an item', async () => {
    const id = await make();
    await deleteWishlistItem(id, userId);
    expect(await getDb().wishlistItem.findUnique({ where: { id } })).toBeNull();
  });

  it('404s updating a missing item', async () => {
    await expect(
      updateWishlistItem(randomUUID(), userId, { status: 'paused' }),
    ).rejects.toThrow(NotFoundError);
  });
});
