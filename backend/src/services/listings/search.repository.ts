import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type {
  GeoPoint,
  ListingSummary,
  SearchListingsFilters,
  SearchListingsResult,
} from './listing.types.js';

type Db = PrismaClient | Tx;

interface SummaryRow extends Omit<ListingSummary, 'location'> {
  lat: number;
  lng: number;
}

// First confirmed photo key per listing, for grid thumbnails.
const coverPhotoSql = Prisma.sql`(
  SELECT s."key"
  FROM "listingPhoto" lp
  JOIN "s3Object" s ON s.id = lp."s3ObjectId"
  WHERE lp."listingId" = "listing".id AND s."lifecycleStatus" = 'confirmed'
  ORDER BY lp."displayOrder" ASC
  LIMIT 1
)`;

function pointSql(c: GeoPoint): Prisma.Sql {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${c.lng}, ${c.lat}), 4326)::geography`;
}

function buildWhere(f: SearchListingsFilters): Prisma.Sql {
  // Only active listings are searchable.
  const conditions: Prisma.Sql[] = [Prisma.sql`status = 'active'::"ListingStatus"`];

  if (f.categoryId) {
    conditions.push(Prisma.sql`"categoryId" = ${f.categoryId}::uuid`);
  }
  if (f.sellerId) {
    conditions.push(Prisma.sql`"sellerId" = ${f.sellerId}::uuid`);
  }
  if (f.favouritedByUserId) {
    conditions.push(
      Prisma.sql`id IN (SELECT "listingId" FROM "favourite" WHERE "userId" = ${f.favouritedByUserId}::uuid)`,
    );
  }
  if (f.listingType) {
    conditions.push(Prisma.sql`"listingType" = ${f.listingType}::"ListingType"`);
  }
  if (f.minPricePence !== undefined) {
    conditions.push(Prisma.sql`"pricePence" >= ${f.minPricePence}`);
  }
  if (f.maxPricePence !== undefined) {
    conditions.push(Prisma.sql`"pricePence" <= ${f.maxPricePence}`);
  }
  if (f.keyword) {
    conditions.push(Prisma.sql`"searchText" @@ plainto_tsquery('english', ${f.keyword})`);
  }
  if (f.center && f.radiusKm !== undefined) {
    conditions.push(
      Prisma.sql`ST_DWithin(location, ${pointSql(f.center)}, ${f.radiusKm * 1000})`,
    );
  }

  return Prisma.join(conditions, ' AND ');
}

function buildOrderBy(f: SearchListingsFilters): Prisma.Sql {
  switch (f.sort) {
    case 'distance':
      return f.center
        ? Prisma.sql`ST_Distance(location, ${pointSql(f.center)}) ASC`
        : Prisma.sql`"publishedAt" DESC NULLS LAST`;
    case 'priceAsc':
      return Prisma.sql`"pricePence" ASC NULLS LAST`;
    case 'priceDesc':
      return Prisma.sql`"pricePence" DESC NULLS LAST`;
    case 'relevance':
      return f.keyword
        ? Prisma.sql`ts_rank("searchText", plainto_tsquery('english', ${f.keyword})) DESC`
        : Prisma.sql`"publishedAt" DESC NULLS LAST`;
    case 'recent':
    default:
      return Prisma.sql`"publishedAt" DESC NULLS LAST, "createdAt" DESC`;
  }
}

export async function searchListings(
  db: Db,
  filters: SearchListingsFilters,
): Promise<SearchListingsResult> {
  const where = buildWhere(filters);
  const distance = filters.center
    ? Prisma.sql`ST_Distance(location, ${pointSql(filters.center)})`
    : Prisma.sql`NULL::float8`;

  const rows = await db.$queryRaw<SummaryRow[]>`
    SELECT
      id, "sellerId", title, "listingType", condition, "pricePence", currency, status,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      ${distance} AS "distanceMetres",
      "publishedAt", "createdAt",
      ${coverPhotoSql} AS "coverPhotoKey"
    FROM "listing"
    WHERE ${where}
    ORDER BY ${buildOrderBy(filters)}
    LIMIT ${filters.limit} OFFSET ${filters.offset}
  `;

  const countResult = await db.$queryRaw<{ count: number }[]>`
    SELECT count(*)::int AS count FROM "listing" WHERE ${where}
  `;

  const items: ListingSummary[] = rows.map((row) => {
    const { lat, lng, ...rest } = row;
    return { ...rest, location: { lat, lng } };
  });

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit: filters.limit,
    offset: filters.offset,
  };
}
