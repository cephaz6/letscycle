import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import { getTransactionParties } from '../transactions/index.js';
import * as meetPointRepo from './meetPoint.repository.js';
import * as sessionRepo from './safeTransit.repository.js';
import { MEET_POINT_SEED } from './meetPoint.data.js';
import type {
  MeetPoint,
  NearbyMeetPointsFilters,
  SafeTransitSession,
  StartSafeTransitInput,
  UpdateSafeTransitInput,
} from './safety.types.js';

// Idempotent by name — safe to run on every deploy.
export async function seedMeetPoints(db: PrismaClient = getDb()): Promise<number> {
  const existing = await meetPointRepo.existingNames(db);
  const missing = MEET_POINT_SEED.filter((m) => !existing.has(m.name));
  for (const seed of missing) {
    await meetPointRepo.insertMeetPoint(db, seed);
  }
  return MEET_POINT_SEED.length;
}

export async function listNearbyMeetPoints(
  filters: NearbyMeetPointsFilters,
  db: PrismaClient = getDb(),
): Promise<MeetPoint[]> {
  return meetPointRepo.findNearby(db, filters);
}

// Starts a safe-transit session for a transaction the caller is party to.
export async function startSafeTransit(
  transactionId: string,
  userId: string,
  input: StartSafeTransitInput,
  db: PrismaClient = getDb(),
): Promise<SafeTransitSession> {
  const parties = await getTransactionParties(transactionId, db);
  if (!parties) {
    throw new NotFoundError('Transaction not found');
  }
  if (userId !== parties.buyerId && userId !== parties.sellerId) {
    throw new ForbiddenError('Not a party to this transaction');
  }
  return sessionRepo.insert(db, {
    transactionId,
    userId,
    liveLocationShareEnabled: input.liveLocationShareEnabled ?? false,
  });
}

// Owner-only updates: arrival, duress, live-share, trusted-contact, end.
export async function updateSafeTransit(
  sessionId: string,
  userId: string,
  input: UpdateSafeTransitInput,
  db: PrismaClient = getDb(),
): Promise<SafeTransitSession> {
  const session = await sessionRepo.findById(db, sessionId);
  if (!session) {
    throw new NotFoundError('Safe transit session not found');
  }
  if (session.userId !== userId) {
    throw new ForbiddenError('Not your safe transit session');
  }
  if (session.endedAt) {
    throw new BadRequestError('This session has already ended');
  }

  const now = new Date();
  const data: Parameters<typeof sessionRepo.update>[2] = {};
  if (input.liveLocationShareEnabled !== undefined) {
    data.liveLocationShareEnabled = input.liveLocationShareEnabled;
  }
  if (input.trustedContactNotified !== undefined) {
    data.trustedContactNotified = input.trustedContactNotified;
  }
  if (input.confirmArrival) data.arrivalConfirmedAt = now;
  if (input.triggerDuress) data.duressTriggeredAt = now;
  if (input.end) data.endedAt = now;

  return sessionRepo.update(db, sessionId, data);
}
