import type { PrismaClient } from '@prisma/client';
import type { ListingSummary, ViewSource } from './listing.types.js';
import { coverPhotoSql } from './search.repository.js';

export async function recordView(
  db: PrismaClient,
  input: { listingId: string; viewerUserId: string | null; source: ViewSource },
): Promise<void> {
  await db.listingView.create({ data: input });
}

interface RecentlyViewedRow extends Omit<ListingSummary, 'location'> {
  lat: number;
  lng: number;
  lastViewedAt: Date;
}

// Distinct listings this user has viewed, most recently viewed first. Own
// listings and anything no longer active are excluded — this is meant to
// read like "things I've been browsing", not a log of every page hit.
export async function getRecentlyViewed(
  db: PrismaClient,
  viewerUserId: string,
  limit: number,
): Promise<ListingSummary[]> {
  const rows = await db.$queryRaw<RecentlyViewedRow[]>`
    SELECT * FROM (
      SELECT DISTINCT ON ("listing".id)
        "listing".id, "listing"."sellerId", "listing".title, "listing"."listingType",
        "listing".condition, "listing"."pricePence", "listing".currency, "listing".status,
        ST_Y("listing".location::geometry) AS lat,
        ST_X("listing".location::geometry) AS lng,
        NULL::float8 AS "distanceMetres",
        "listing"."publishedAt", "listing"."createdAt",
        ${coverPhotoSql} AS "coverPhotoKey",
        "listingView"."viewedAt" AS "lastViewedAt"
      FROM "listingView"
      JOIN "listing" ON "listing".id = "listingView"."listingId"
      WHERE "listingView"."viewerUserId" = ${viewerUserId}::uuid
        AND "listing".status = 'active'::"ListingStatus"
        AND "listing"."sellerId" != ${viewerUserId}::uuid
      ORDER BY "listing".id, "listingView"."viewedAt" DESC
    ) sub
    ORDER BY "lastViewedAt" DESC
    LIMIT ${limit}
  `;

  return rows.map(({ lat, lng, lastViewedAt: _lastViewedAt, ...rest }) => ({
    ...rest,
    location: { lat, lng },
  }));
}
