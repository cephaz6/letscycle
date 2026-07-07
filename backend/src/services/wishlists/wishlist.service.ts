import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/httpErrors.js';
import { assertCategoryExists } from '../listings/index.js';
import * as repo from './wishlist.repository.js';
import type {
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
  WishlistItem,
} from './wishlist.types.js';

function cleanKeywords(keywords: string[] | undefined): string[] {
  return (keywords ?? []).map((k) => k.trim()).filter((k) => k.length > 0);
}

export async function createWishlistItem(
  input: CreateWishlistItemInput,
  db: PrismaClient = getDb(),
): Promise<WishlistItem> {
  if (input.categoryId) {
    await assertCategoryExists(input.categoryId, db);
  }

  const item = await withTransaction(async (tx) => {
    const created = await repo.insert(tx, {
      userId: input.userId,
      categoryId: input.categoryId ?? null,
      keywords: cleanKeywords(input.keywords),
      maxPricePence: input.maxPricePence ?? null,
      maxDistanceKm: input.maxDistanceKm,
      listingTypePreference: input.listingTypePreference ?? 'both',
      expiresAt: input.expiresAt ?? null,
    });
    await publishEvent(tx, {
      eventType: 'wishlistItem.created',
      aggregateType: 'wishlistItem',
      aggregateId: created.id,
      payload: { wishlistItemId: created.id, userId: input.userId },
    });
    return created;
  }, db);

  return item;
}

export async function listMyWishlist(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<WishlistItem[]> {
  return repo.findByUser(db, userId);
}

async function requireOwned(db: PrismaClient, id: string, userId: string) {
  const item = await repo.getForUpdate(db, id);
  if (!item) {
    throw new NotFoundError('Wishlist item not found');
  }
  if (item.userId !== userId) {
    throw new ForbiddenError('Not your wishlist item');
  }
  return item;
}

export async function updateWishlistItem(
  id: string,
  userId: string,
  input: UpdateWishlistItemInput,
  db: PrismaClient = getDb(),
): Promise<WishlistItem> {
  await requireOwned(db, id, userId);
  if (input.categoryId) {
    await assertCategoryExists(input.categoryId, db);
  }

  const patch: repo.WishlistUpdatePatch = {};
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.keywords !== undefined) patch.keywords = cleanKeywords(input.keywords);
  if (input.maxPricePence !== undefined) patch.maxPricePence = input.maxPricePence;
  if (input.maxDistanceKm !== undefined) patch.maxDistanceKm = input.maxDistanceKm;
  if (input.listingTypePreference !== undefined) {
    patch.listingTypePreference = input.listingTypePreference;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt;

  await withTransaction(async (tx) => {
    await repo.update(tx, id, patch);
    await publishEvent(tx, {
      eventType: 'wishlistItem.updated',
      aggregateType: 'wishlistItem',
      aggregateId: id,
      payload: { wishlistItemId: id },
    });
  }, db);

  const updated = await repo.findById(db, id);
  if (!updated) {
    throw new NotFoundError('Wishlist item not found');
  }
  return updated;
}

export async function deleteWishlistItem(
  id: string,
  userId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  await requireOwned(db, id, userId);
  await repo.remove(db, id);
}
