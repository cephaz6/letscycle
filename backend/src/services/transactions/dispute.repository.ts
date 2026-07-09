import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { DisputeView } from './transaction.types.js';

type Db = PrismaClient | Tx;

const disputeSelect = {
  id: true,
  transactionId: true,
  openedByUserId: true,
  reason: true,
  description: true,
  status: true,
  resolvedAt: true,
  createdAt: true,
} as const;

export async function insert(
  tx: Tx,
  input: {
    transactionId: string;
    openedByUserId: string;
    reason: string;
    description: string;
  },
): Promise<DisputeView> {
  return tx.dispute.create({ data: input, select: disputeSelect });
}

export async function findByTransaction(
  db: Db,
  transactionId: string,
): Promise<DisputeView | null> {
  return db.dispute.findFirst({
    where: { transactionId },
    select: disputeSelect,
    orderBy: { createdAt: 'desc' },
  });
}
