import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { FlagTargetType, FlagView } from './trust.types.js';

type Db = PrismaClient | Tx;

const flagSelect = {
  id: true,
  targetType: true,
  targetId: true,
  reporterUserId: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
} as const;

export async function insert(
  tx: Tx,
  input: {
    targetType: FlagTargetType;
    targetId: string;
    reporterUserId: string;
    reason: string;
    description: string | null;
  },
): Promise<FlagView> {
  return tx.flag.create({ data: input, select: flagSelect });
}

export async function findByReporter(
  db: Db,
  reporterUserId: string,
  targetType: FlagTargetType,
  targetId: string,
): Promise<FlagView | null> {
  return db.flag.findFirst({
    where: { reporterUserId, targetType, targetId, status: 'open' },
    select: flagSelect,
  });
}
