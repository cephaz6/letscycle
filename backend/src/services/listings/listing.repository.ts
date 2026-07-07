import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type {
  ListingCondition,
  ListingLocation,
  ListingStatus,
  ListingType,
} from './listing.types.js';

type Db = PrismaClient | Tx;

export interface ListingCoreRow {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  categoryId: string;
  condition: ListingCondition;
  listingType: ListingType;
  pricePence: number | null;
  currency: string;
  lat: number;
  lng: number;
  locationAccuracyMetres: number;
  status: ListingStatus;
  deadlineAt: Date | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  attributes: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertListingParams {
  sellerId: string;
  title: string;
  description: string;
  categoryId: string;
  condition: ListingCondition;
  listingType: ListingType;
  pricePence: number | null;
  location: ListingLocation;
  status: ListingStatus;
  deadlineAt: Date | null;
  publishedAt: Date | null;
  attributes: Record<string, unknown>;
}

// Raw INSERT because location is geography (Prisma can't set it) and it is
// NOT NULL, so the row can't be created scalar-first then patched.
export async function insertListing(
  tx: Tx,
  p: InsertListingParams,
): Promise<{ id: string }> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO "listing" (
      "sellerId", title, description, "categoryId", condition, "listingType",
      "pricePence", location, "locationAccuracyMetres", status,
      "deadlineAt", "publishedAt", attributes
    ) VALUES (
      ${p.sellerId}::uuid, ${p.title}, ${p.description}, ${p.categoryId}::uuid,
      ${p.condition}::"ListingCondition", ${p.listingType}::"ListingType",
      ${p.pricePence},
      ST_SetSRID(ST_MakePoint(${p.location.lng}, ${p.location.lat}), 4326)::geography,
      ${p.location.accuracyMetres}, ${p.status}::"ListingStatus",
      ${p.deadlineAt}, ${p.publishedAt}, ${JSON.stringify(p.attributes)}::jsonb
    )
    RETURNING id
  `;
  return rows[0]!;
}

export async function getCore(db: Db, id: string): Promise<ListingCoreRow | null> {
  const rows = await db.$queryRaw<ListingCoreRow[]>`
    SELECT
      id, "sellerId", title, description, "categoryId", condition, "listingType",
      "pricePence", currency,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      "locationAccuracyMetres", status, "deadlineAt", "publishedAt", "expiresAt",
      attributes, "createdAt", "updatedAt"
    FROM "listing"
    WHERE id = ${id}::uuid
  `;
  return rows[0] ?? null;
}

// Lightweight fetch for ownership checks, legal transitions, and price rules,
// without loading the whole row (or the geography column).
export async function getForUpdate(
  db: Db,
  id: string,
): Promise<{
  sellerId: string;
  status: ListingStatus;
  publishedAt: Date | null;
  listingType: ListingType;
} | null> {
  return db.listing.findUnique({
    where: { id },
    select: { sellerId: true, status: true, publishedAt: true, listingType: true },
  });
}

export interface ListingUpdatePatch {
  title?: string;
  description?: string;
  categoryId?: string;
  condition?: ListingCondition;
  pricePence?: number | null;
  deadlineAt?: Date | null;
  attributes?: Record<string, unknown>;
  status?: ListingStatus;
  publishedAt?: Date | null;
  location?: ListingLocation;
}

export async function updateListing(
  tx: Tx,
  id: string,
  patch: ListingUpdatePatch,
): Promise<void> {
  const data: Prisma.ListingUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.categoryId !== undefined) {
    data.category = { connect: { id: patch.categoryId } };
  }
  if (patch.condition !== undefined) data.condition = patch.condition;
  if (patch.pricePence !== undefined) data.pricePence = patch.pricePence;
  if (patch.deadlineAt !== undefined) data.deadlineAt = patch.deadlineAt;
  if (patch.attributes !== undefined) {
    data.attributes = patch.attributes as Prisma.InputJsonValue;
  }
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.publishedAt !== undefined) data.publishedAt = patch.publishedAt;

  if (Object.keys(data).length > 0) {
    await tx.listing.update({ where: { id }, data });
  }

  if (patch.location) {
    const loc = patch.location;
    await tx.$executeRaw`
      UPDATE "listing"
      SET location = ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)::geography,
          "locationAccuracyMetres" = ${loc.accuracyMetres}
      WHERE id = ${id}::uuid
    `;
  }
}
