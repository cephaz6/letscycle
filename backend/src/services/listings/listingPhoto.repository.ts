import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { ListingPhotoDetail } from './listing.types.js';

type Db = PrismaClient | Tx;

export async function insertPhoto(
  db: Db,
  input: {
    listingId: string;
    s3ObjectId: string;
    displayOrder: number;
    width: number;
    height: number;
  },
): Promise<{ id: string }> {
  return db.listingPhoto.create({ data: input, select: { id: true } });
}

export async function getPhoto(
  db: Db,
  photoId: string,
): Promise<{ id: string; listingId: string; s3ObjectId: string } | null> {
  return db.listingPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, listingId: true, s3ObjectId: true },
  });
}

// Only photos whose underlying S3 object is confirmed are visible — this is
// what realises the two-step upload (pending uploads never show).
export async function listConfirmedPhotos(
  db: Db,
  listingId: string,
): Promise<ListingPhotoDetail[]> {
  const rows = await db.listingPhoto.findMany({
    where: { listingId, s3Object: { lifecycleStatus: 'confirmed' } },
    select: {
      id: true,
      displayOrder: true,
      width: true,
      height: true,
      s3Object: { select: { key: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    key: row.s3Object.key,
    displayOrder: row.displayOrder,
    width: row.width,
    height: row.height,
  }));
}
