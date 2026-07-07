import type { PrismaClient } from '@prisma/client';

// Idempotent: the unique (userId, listingId) constraint makes a repeat
// favourite a no-op rather than an error.
export async function addFavourite(
  db: PrismaClient,
  userId: string,
  listingId: string,
): Promise<void> {
  await db.favourite.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });
}

export async function removeFavourite(
  db: PrismaClient,
  userId: string,
  listingId: string,
): Promise<void> {
  await db.favourite.deleteMany({ where: { userId, listingId } });
}
