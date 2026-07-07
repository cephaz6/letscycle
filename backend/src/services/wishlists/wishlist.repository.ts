import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type {
  ListingTypePreference,
  WishlistItem,
  WishlistItemStatus,
} from './wishlist.types.js';

type Db = PrismaClient | Tx;

// searchText is a DB-generated tsvector, so it is never written here.
const wishlistSelect = {
  id: true,
  userId: true,
  categoryId: true,
  keywords: true,
  maxPricePence: true,
  maxDistanceKm: true,
  listingTypePreference: true,
  status: true,
  expiresAt: true,
  fulfilledAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface InsertWishlistParams {
  userId: string;
  categoryId: string | null;
  keywords: string[];
  maxPricePence: number | null;
  maxDistanceKm: number;
  listingTypePreference: ListingTypePreference;
  expiresAt: Date | null;
}

export async function insert(tx: Tx, p: InsertWishlistParams): Promise<WishlistItem> {
  return tx.wishlistItem.create({ data: p, select: wishlistSelect });
}

export async function findById(db: Db, id: string): Promise<WishlistItem | null> {
  return db.wishlistItem.findUnique({ where: { id }, select: wishlistSelect });
}

export async function findByUser(db: Db, userId: string): Promise<WishlistItem[]> {
  return db.wishlistItem.findMany({
    where: { userId },
    select: wishlistSelect,
    orderBy: { createdAt: 'desc' },
  });
}

// Only the owner + status needed to authorise and validate an update.
export async function getForUpdate(
  db: Db,
  id: string,
): Promise<{ userId: string; status: WishlistItemStatus } | null> {
  return db.wishlistItem.findUnique({
    where: { id },
    select: { userId: true, status: true },
  });
}

export interface WishlistUpdatePatch {
  categoryId?: string | null;
  keywords?: string[];
  maxPricePence?: number | null;
  maxDistanceKm?: number;
  listingTypePreference?: ListingTypePreference;
  status?: WishlistItemStatus;
  expiresAt?: Date | null;
}

export async function update(
  tx: Tx,
  id: string,
  patch: WishlistUpdatePatch,
): Promise<void> {
  await tx.wishlistItem.update({ where: { id }, data: patch });
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.wishlistItem.delete({ where: { id } });
}
