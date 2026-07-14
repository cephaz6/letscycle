import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { TrustEventType, TrustScoreView } from './trust.types.js';

type Db = PrismaClient | Tx;

export async function insertTrustEvent(
  tx: Tx,
  input: {
    userId: string;
    eventType: TrustEventType;
    impact: number;
    payload: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.trustEvent.create({ data: input });
}

export async function listEventImpacts(
  db: Db,
  userId: string,
): Promise<{ eventType: TrustEventType; impact: number }[]> {
  const rows = await db.trustEvent.findMany({
    where: { userId },
    select: { eventType: true, impact: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows;
}

// Dedupe guard: has this user already got an event of this type referencing
// this aggregate id (e.g. a transactionId)? Prevents double-counting on
// at-least-once event redelivery.
export async function hasEventForRef(
  db: Db,
  userId: string,
  eventType: TrustEventType,
  refKey: string,
  refId: string,
): Promise<boolean> {
  const row = await db.trustEvent.findFirst({
    where: {
      userId,
      eventType,
      payload: { path: [refKey], equals: refId },
    },
    select: { id: true },
  });
  return row !== null;
}

export async function upsertTrustScore(
  tx: Tx,
  input: {
    userId: string;
    currentScore: number;
    scoreComponents: Prisma.InputJsonValue;
  },
): Promise<void> {
  const data = {
    currentScore: input.currentScore,
    scoreComponents: input.scoreComponents,
    lastCalculatedAt: new Date(),
  };
  await tx.trustScore.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, ...data },
    update: data,
  });
}

export async function getTrustScore(
  db: Db,
  userId: string,
): Promise<TrustScoreView | null> {
  const row = await db.trustScore.findUnique({
    where: { userId },
    select: {
      userId: true,
      currentScore: true,
      scoreComponents: true,
      lastCalculatedAt: true,
    },
  });
  if (!row) return null;
  return {
    userId: row.userId,
    currentScore: row.currentScore,
    scoreComponents: (row.scoreComponents as Record<string, number>) ?? {},
    lastCalculatedAt: row.lastCalculatedAt,
  };
}
