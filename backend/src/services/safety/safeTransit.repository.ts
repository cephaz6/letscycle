import type { PrismaClient } from '@prisma/client';
import type { SafeTransitSession } from './safety.types.js';

const sessionSelect = {
  id: true,
  transactionId: true,
  userId: true,
  startedAt: true,
  endedAt: true,
  liveLocationShareEnabled: true,
  trustedContactNotified: true,
  arrivalConfirmedAt: true,
  duressTriggeredAt: true,
} as const;

export async function insert(
  db: PrismaClient,
  input: { transactionId: string; userId: string; liveLocationShareEnabled: boolean },
): Promise<SafeTransitSession> {
  return db.safeTransitSession.create({ data: input, select: sessionSelect });
}

export async function findById(
  db: PrismaClient,
  id: string,
): Promise<SafeTransitSession | null> {
  return db.safeTransitSession.findUnique({ where: { id }, select: sessionSelect });
}

export async function update(
  db: PrismaClient,
  id: string,
  data: {
    liveLocationShareEnabled?: boolean;
    trustedContactNotified?: boolean;
    arrivalConfirmedAt?: Date;
    duressTriggeredAt?: Date;
    endedAt?: Date;
  },
): Promise<SafeTransitSession> {
  return db.safeTransitSession.update({ where: { id }, data, select: sessionSelect });
}
