import type { Prisma, PrismaClient } from '@prisma/client';
import { getDb } from './client.js';

// Services take a Tx so multi-repository work (including outbox writes)
// commits atomically.
export type Tx = Prisma.TransactionClient;

export function withTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
  db: PrismaClient = getDb(),
): Promise<T> {
  return db.$transaction(fn);
}
