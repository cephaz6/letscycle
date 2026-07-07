import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';

type Db = PrismaClient | Tx;

// Idempotent: the unique (userId, termsVersion) constraint means re-accepting
// the same version is a no-op rather than an error.
export async function insertAcceptance(
  db: Db,
  input: { userId: string; termsVersion: string },
): Promise<void> {
  await db.termsAcceptance.upsert({
    where: {
      userId_termsVersion: {
        userId: input.userId,
        termsVersion: input.termsVersion,
      },
    },
    create: input,
    update: {},
  });
}

export async function hasAccepted(
  db: Db,
  userId: string,
  termsVersion: string,
): Promise<boolean> {
  const row = await db.termsAcceptance.findUnique({
    where: { userId_termsVersion: { userId, termsVersion } },
    select: { id: true },
  });
  return row !== null;
}
