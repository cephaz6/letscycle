import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { MeetPoint, NearbyMeetPointsFilters } from './safety.types.js';
import type { MeetPointSeed } from './meetPoint.data.js';

type Db = PrismaClient | Tx;

interface MeetPointRow extends Omit<MeetPoint, 'location'> {
  lat: number;
  lng: number;
}

// Nearby verified, active meet points, nearest first (geography → raw SQL).
export async function findNearby(
  db: Db,
  filters: NearbyMeetPointsFilters,
): Promise<MeetPoint[]> {
  // Fully parameterised: $1 lng, $2 lat, $3 radius metres, $4 limit.
  const rows = await db.$queryRawUnsafe<MeetPointRow[]>(
    `
    WITH p AS (SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS g)
    SELECT m.id, m.name, m.address, m.category::text AS category,
      ST_Y(m.location::geometry) AS lat,
      ST_X(m.location::geometry) AS lng,
      ST_Distance(m.location, p.g) AS "distanceMetres",
      m."openingHours", m.notes
    FROM "meetPoint" m, p
    WHERE m.active = true AND m."verifiedAt" IS NOT NULL
      AND ST_DWithin(m.location, p.g, $3)
    ORDER BY "distanceMetres" ASC
    LIMIT $4
    `,
    filters.lng,
    filters.lat,
    filters.radiusKm * 1000,
    filters.limit,
  );
  return rows.map(({ lat, lng, ...rest }) => ({ ...rest, location: { lat, lng } }));
}

export async function countAll(db: Db): Promise<number> {
  return db.meetPoint.count();
}

export async function existingNames(db: Db): Promise<Set<string>> {
  const rows = await db.meetPoint.findMany({ select: { name: true } });
  return new Set(rows.map((r) => r.name));
}

// Inserts one verified, active meet point (geography → raw SQL).
export async function insertMeetPoint(db: Db, seed: MeetPointSeed): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "meetPoint" (
      name, location, address, category, "verifiedAt", "openingHours", active
    ) VALUES (
      ${seed.name},
      ST_SetSRID(ST_MakePoint(${seed.lng}, ${seed.lat}), 4326)::geography,
      ${seed.address},
      ${seed.category}::"MeetPointCategory",
      now(), '{}'::jsonb, true
    )
  `;
}
