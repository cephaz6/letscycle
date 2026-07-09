import type { Prisma, PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction, type Tx } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import { BadRequestError, ForbiddenError } from '../../shared/errors/httpErrors.js';
import { getTransactionParties } from '../transactions/index.js';
import * as repo from './trust.repository.js';
import * as reviewRepo from './review.repository.js';
import * as flagRepo from './flag.repository.js';
import { TRUST_IMPACT, computeTrustScore, reviewEventType } from './scorer.js';
import type {
  FlagView,
  RaiseFlagInput,
  ReviewView,
  SubmitReviewInput,
  TrustEventType,
  TrustScoreView,
} from './trust.types.js';

// Appends a trust event and recomputes the user's score in one transaction.
// refKey/refId make it idempotent against at-least-once event redelivery.
async function recordTrustEvent(
  db: PrismaClient,
  input: {
    userId: string;
    eventType: TrustEventType;
    impact?: number;
    payload: Record<string, unknown>;
    ref?: { key: string; id: string };
  },
): Promise<void> {
  if (
    input.ref &&
    (await repo.hasEventForRef(
      db,
      input.userId,
      input.eventType,
      input.ref.key,
      input.ref.id,
    ))
  ) {
    return; // already counted
  }

  const impact = input.impact ?? TRUST_IMPACT[input.eventType];
  await withTransaction(async (tx) => {
    await repo.insertTrustEvent(tx, {
      userId: input.userId,
      eventType: input.eventType,
      impact,
      payload: input.payload as Prisma.InputJsonValue,
    });
    await recompute(tx, input.userId);
  }, db);
}

async function recompute(tx: Tx, userId: string): Promise<void> {
  const events = await repo.listEventImpacts(tx, userId);
  const { currentScore, scoreComponents } = computeTrustScore(events);
  await repo.upsertTrustScore(tx, { userId, currentScore, scoreComponents });
}

export async function getUserTrustScore(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<TrustScoreView | null> {
  return repo.getTrustScore(db, userId);
}

// POST /reviews — reviewer rates the other party of a completed transaction.
export async function submitReview(
  reviewerUserId: string,
  input: SubmitReviewInput,
  db: PrismaClient = getDb(),
): Promise<ReviewView> {
  const parties = await getTransactionParties(input.transactionId, db);
  if (!parties) {
    throw new BadRequestError('Unknown transaction');
  }
  if (reviewerUserId !== parties.buyerId && reviewerUserId !== parties.sellerId) {
    throw new ForbiddenError('Only a party to the transaction can review it');
  }
  if (parties.status !== 'completed') {
    throw new BadRequestError('You can only review a completed transaction');
  }
  if (await reviewRepo.findByReviewer(db, input.transactionId, reviewerUserId)) {
    throw new BadRequestError('You have already reviewed this transaction');
  }

  const revieweeUserId =
    reviewerUserId === parties.buyerId ? parties.sellerId : parties.buyerId;

  const review = await withTransaction(async (tx) => {
    const created = await reviewRepo.insert(tx, {
      transactionId: input.transactionId,
      reviewerUserId,
      revieweeUserId,
      rating: input.rating,
      comment: input.comment ?? null,
    });
    await publishEvent(tx, {
      eventType: 'review.submitted',
      aggregateType: 'review',
      aggregateId: created.id,
      payload: { reviewId: created.id, revieweeUserId },
    });
    return created;
  }, db);

  // Feed the reviewee's trust score.
  const eventType = reviewEventType(input.rating);
  if (eventType) {
    await recordTrustEvent(db, {
      userId: revieweeUserId,
      eventType,
      payload: { reviewId: review.id, transactionId: input.transactionId },
      ref: { key: 'reviewId', id: review.id },
    });
  }

  return review;
}

// POST /flags — raise a moderation flag (does not affect trust until actioned).
export async function raiseFlag(
  reporterUserId: string,
  input: RaiseFlagInput,
  db: PrismaClient = getDb(),
): Promise<FlagView> {
  const existing = await flagRepo.findByReporter(
    db,
    reporterUserId,
    input.targetType,
    input.targetId,
  );
  if (existing) return existing; // idempotent per open flag

  const flag = await withTransaction(async (tx) => {
    const created = await flagRepo.insert(tx, {
      targetType: input.targetType,
      targetId: input.targetId,
      reporterUserId,
      reason: input.reason,
      description: input.description ?? null,
    });
    await publishEvent(tx, {
      eventType: 'flag.raised',
      aggregateType: 'flag',
      aggregateId: created.id,
      payload: {
        flagId: created.id,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    });
    return created;
  }, db);

  return flag;
}

// --- event handlers (registered on the bus) ---

// Both parties of a completed transaction gain a successfulTransaction event.
export async function handleTransactionCompleted(
  transactionId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  const parties = await getTransactionParties(transactionId, db);
  if (!parties) return;
  for (const userId of [parties.buyerId, parties.sellerId]) {
    await recordTrustEvent(db, {
      userId,
      eventType: 'successfulTransaction',
      payload: { transactionId },
      ref: { key: 'transactionId', id: transactionId },
    });
  }
}

export async function handleUserVerified(
  userId: string,
  verificationType: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  if (verificationType !== 'idDocument') return;
  await recordTrustEvent(db, {
    userId,
    eventType: 'idVerified',
    payload: { verificationType },
    ref: { key: 'verificationType', id: verificationType },
  });
}
