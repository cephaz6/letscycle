import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import { DEFAULT_WEIGHTS, type MatchWeights } from './scorer.js';

type Db = PrismaClient | Tx;

const DEFAULT_TOP_N = 10;

// Matching is an extractable module: it reads the tables it needs directly via
// SQL and is triggered only by events. It never imports another feature
// module's code — this is what lets it move to its own Lambda later.

export interface ListingForMatching {
  id: string;
  sellerId: string;
  status: string;
  listingType: 'sell' | 'giveaway';
  deadlineAt: Date | null;
}

export async function getListingForMatching(
  db: Db,
  listingId: string,
): Promise<ListingForMatching | null> {
  const rows = await db.$queryRaw<ListingForMatching[]>`
    SELECT id, "sellerId", status::text AS status,
           "listingType"::text AS "listingType", "deadlineAt"
    FROM "listing"
    WHERE id = ${listingId}::uuid
  `;
  return rows[0] ?? null;
}

export interface CandidateRow {
  wishlistItemId: string;
  userId: string;
  distanceMetres: number;
  maxDistanceKm: number;
  keywordRank: number;
  trustScore: number;
}

// The whole eligibility filter runs in SQL (backend-prd.md step 1): category
// match/any, price ceiling (or giveaway), type preference, and geospatial
// radius from the buyer's home location. Ranking inputs (distance, keyword
// ts_rank, cached trust) come back per row for the pure scorer.
export async function findCandidateWishlists(
  db: Db,
  listingId: string,
): Promise<CandidateRow[]> {
  return db.$queryRaw<CandidateRow[]>`
    WITH l AS (
      SELECT id, "sellerId", "categoryId", "listingType", "pricePence",
             location, "searchText"
      FROM "listing"
      WHERE id = ${listingId}::uuid
    )
    SELECT
      w.id AS "wishlistItemId",
      w."userId" AS "userId",
      ST_Distance(u."homeLocation", l.location) AS "distanceMetres",
      w."maxDistanceKm" AS "maxDistanceKm",
      ts_rank(
        l."searchText",
        plainto_tsquery('english', array_to_string(w.keywords, ' '))
      ) AS "keywordRank",
      COALESCE(t."currentScore", 0.5) AS "trustScore"
    FROM l
    JOIN "wishlistItem" w ON w.status = 'active'
    JOIN "user" u
      ON u.id = w."userId"
      AND u."accountStatus" = 'active'
      AND u."homeLocation" IS NOT NULL
    LEFT JOIN "trustScore" t ON t."userId" = w."userId"
    WHERE w."userId" <> l."sellerId"
      AND (w."categoryId" IS NULL OR w."categoryId" = l."categoryId")
      AND (
        w."listingTypePreference" = 'both'
        OR w."listingTypePreference"::text = l."listingType"::text
      )
      AND (
        l."listingType" = 'giveaway'
        OR w."maxPricePence" IS NULL
        OR w."maxPricePence" >= l."pricePence"
      )
      AND ST_DWithin(u."homeLocation", l.location, w."maxDistanceKm" * 1000)
  `;
}

// Config lives in siteSetting (system module owns the table). Matching reads it
// directly rather than calling system code, with safe fallbacks if unseeded.
export async function getWeights(db: Db): Promise<MatchWeights> {
  const rows = await db.$queryRaw<{ value: unknown }[]>`
    SELECT value FROM "siteSetting" WHERE key = 'matching.weights'
  `;
  const value = rows[0]?.value;
  if (value && typeof value === 'object') {
    const w = value as Partial<MatchWeights>;
    if (
      typeof w.proximity === 'number' &&
      typeof w.keyword === 'number' &&
      typeof w.trust === 'number' &&
      typeof w.urgency === 'number'
    ) {
      return {
        proximity: w.proximity,
        keyword: w.keyword,
        trust: w.trust,
        urgency: w.urgency,
      };
    }
  }
  return DEFAULT_WEIGHTS;
}

export async function getTopN(db: Db): Promise<number> {
  const rows = await db.$queryRaw<{ value: unknown }[]>`
    SELECT value FROM "siteSetting" WHERE key = 'matching.topN'
  `;
  const value = rows[0]?.value;
  return typeof value === 'number' && value > 0 ? value : DEFAULT_TOP_N;
}

export async function countCandidatesForListing(
  db: Db,
  listingId: string,
): Promise<number> {
  return db.matchCandidate.count({ where: { listingId } });
}

export interface InsertCandidate {
  id: string;
  listingId: string;
  wishlistItemId: string;
  userId: string;
  compositeScore: number;
  proximityScore: number;
  keywordScore: number;
  trustScoreAtMatch: number;
  urgencyScore: number;
  rank: number;
}

export async function insertCandidates(tx: Tx, rows: InsertCandidate[]): Promise<void> {
  await tx.matchCandidate.createMany({
    data: rows.map((r) => ({ ...r, status: 'notified', notifiedAt: new Date() })),
  });
}

export async function insertMatchEvent(
  tx: Tx,
  input: {
    listingId: string;
    eventType:
      'candidatesComputed' | 'notificationsSent' | 'interestExpressed' | 'winnerSelected';
    payload: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.matchEvent.create({ data: input });
}

export interface CandidateForInterest {
  id: string;
  listingId: string;
  userId: string;
  status: string;
}

export async function getCandidate(
  db: Db,
  candidateId: string,
): Promise<CandidateForInterest | null> {
  return db.matchCandidate.findUnique({
    where: { id: candidateId },
    select: { id: true, listingId: true, userId: true, status: true },
  });
}

export async function markInterested(tx: Tx, candidateId: string): Promise<void> {
  await tx.matchCandidate.update({
    where: { id: candidateId },
    data: { status: 'interested', expressedInterestAt: new Date() },
  });
}
