import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { TransactionStatus, TransactionView } from './transaction.types.js';

type Db = PrismaClient | Tx;

const transactionSelect = {
  id: true,
  listingId: true,
  buyerId: true,
  sellerId: true,
  amountPence: true,
  commissionPence: true,
  currency: true,
  status: true,
  meetPointId: true,
  agreedPickupAt: true,
  completedAt: true,
  stripePaymentIntentId: true,
  stripeTransferId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function insert(
  tx: Tx,
  input: {
    listingId: string;
    buyerId: string;
    sellerId: string;
    amountPence: number;
    commissionPence: number;
    agreedPickupAt: Date | null;
  },
): Promise<TransactionView> {
  return tx.transaction.create({ data: input, select: transactionSelect });
}

export async function findById(db: Db, id: string): Promise<TransactionView | null> {
  return db.transaction.findUnique({ where: { id }, select: transactionSelect });
}

// Guards against two buyers transacting the same listing at once.
export async function findActiveForListing(
  db: Db,
  listingId: string,
): Promise<TransactionView | null> {
  return db.transaction.findFirst({
    where: { listingId, status: { notIn: ['cancelled', 'refunded'] } },
    select: transactionSelect,
  });
}

export async function listByUser(db: Db, userId: string): Promise<TransactionView[]> {
  return db.transaction.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: transactionSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateTransaction(
  tx: Tx,
  id: string,
  data: {
    status?: TransactionStatus;
    stripePaymentIntentId?: string;
    stripeTransferId?: string;
    completedAt?: Date;
  },
): Promise<void> {
  await tx.transaction.update({ where: { id }, data });
}

export async function insertEvent(
  tx: Tx,
  input: {
    transactionId: string;
    eventType: string;
    actorId: string | null;
    notes?: string;
    payload?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.transactionEvent.create({
    data: {
      transactionId: input.transactionId,
      eventType: input.eventType,
      actorId: input.actorId,
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.payload !== undefined && { payload: input.payload }),
    },
  });
}

// Distinct actors who have recorded an event of a given type (used to detect
// when both parties have confirmed pickup).
export async function distinctEventActors(
  db: Db,
  transactionId: string,
  eventType: string,
): Promise<string[]> {
  const rows = await db.transactionEvent.findMany({
    where: { transactionId, eventType, actorId: { not: null } },
    select: { actorId: true },
    distinct: ['actorId'],
  });
  return rows.map((r) => r.actorId).filter((id): id is string => id !== null);
}

// Timestamp of the capture event, for hold-period calculation.
export async function capturedAt(db: Db, transactionId: string): Promise<Date | null> {
  const row = await db.transactionEvent.findFirst({
    where: { transactionId, eventType: 'paymentCaptured' },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return row?.createdAt ?? null;
}
