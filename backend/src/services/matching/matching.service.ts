import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import * as repo from './matching.repository.js';
import { scoreCandidate } from './scorer.js';
import type { InsertCandidate } from './matching.repository.js';

// Triggered by listing.created (backend-prd.md "Matching algorithm — v1").
// Idempotent: re-delivery of the event is a no-op once candidates exist.
export async function computeCandidatesForListing(
  listingId: string,
  db: PrismaClient = getDb(),
): Promise<{ candidateCount: number }> {
  const listing = await repo.getListingForMatching(db, listingId);
  if (!listing || listing.status !== 'active') {
    return { candidateCount: 0 };
  }
  if ((await repo.countCandidatesForListing(db, listingId)) > 0) {
    return { candidateCount: 0 };
  }

  const [rawCandidates, weights, topN] = await Promise.all([
    repo.findCandidateWishlists(db, listingId),
    repo.getWeights(db),
    repo.getTopN(db),
  ]);

  const scored = rawCandidates
    .map((candidate) => ({
      candidate,
      scores: scoreCandidate(candidate, listing.deadlineAt, weights),
    }))
    .sort((a, b) => b.scores.compositeScore - a.scores.compositeScore)
    .slice(0, topN);

  const rows: InsertCandidate[] = scored.map((entry, index) => ({
    id: randomUUID(),
    listingId,
    wishlistItemId: entry.candidate.wishlistItemId,
    userId: entry.candidate.userId,
    compositeScore: entry.scores.compositeScore,
    proximityScore: entry.scores.proximityScore,
    keywordScore: entry.scores.keywordScore,
    trustScoreAtMatch: entry.scores.trustScoreAtMatch,
    urgencyScore: entry.scores.urgencyScore,
    rank: index + 1,
  }));

  await withTransaction(async (tx) => {
    if (rows.length > 0) {
      await repo.insertCandidates(tx, rows);
    }
    await repo.insertMatchEvent(tx, {
      listingId,
      eventType: 'candidatesComputed',
      payload: { count: rows.length, matchCandidateIds: rows.map((r) => r.id) },
    });
    if (rows.length > 0) {
      await publishEvent(tx, {
        eventType: 'match.candidatesFound',
        aggregateType: 'listing',
        aggregateId: listingId,
        payload: { listingId, matchCandidateIds: rows.map((r) => r.id) },
      });
    }
  }, db);

  return { candidateCount: rows.length };
}

// Buyer-facing: the matched buyer signals interest in a candidate.
export async function expressInterest(
  candidateId: string,
  userId: string,
  db: PrismaClient = getDb(),
): Promise<{ candidateId: string; status: 'interested' }> {
  const candidate = await repo.getCandidate(db, candidateId);
  if (!candidate) {
    throw new NotFoundError('Match candidate not found');
  }
  if (candidate.userId !== userId) {
    throw new ForbiddenError('Not your match candidate');
  }
  if (candidate.status === 'interested') {
    return { candidateId, status: 'interested' };
  }
  if (candidate.status !== 'notified') {
    throw new BadRequestError('This candidate is no longer available');
  }

  await withTransaction(async (tx) => {
    await repo.markInterested(tx, candidateId);
    await repo.insertMatchEvent(tx, {
      listingId: candidate.listingId,
      eventType: 'interestExpressed',
      payload: { matchCandidateId: candidateId, userId },
    });
    await publishEvent(tx, {
      eventType: 'match.interestExpressed',
      aggregateType: 'matchCandidate',
      aggregateId: candidateId,
      payload: { matchCandidateId: candidateId, userId },
    });
  }, db);

  return { candidateId, status: 'interested' };
}
