import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { ConversationView } from './messaging.types.js';

type Db = PrismaClient | Tx;

const conversationSelect = {
  id: true,
  listingId: true,
  buyerId: true,
  sellerId: true,
  status: true,
  lastMessageAt: true,
  createdAt: true,
} as const;

export async function insert(
  db: Db,
  input: { listingId: string | null; buyerId: string; sellerId: string },
): Promise<ConversationView> {
  return db.conversation.create({ data: input, select: conversationSelect });
}

// A buyer has one conversation per listing with a given seller.
export async function findExisting(
  db: Db,
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<ConversationView | null> {
  return db.conversation.findFirst({
    where: { listingId, buyerId, sellerId },
    select: conversationSelect,
  });
}

export async function findById(db: Db, id: string): Promise<ConversationView | null> {
  return db.conversation.findUnique({ where: { id }, select: conversationSelect });
}

export async function listForUser(db: Db, userId: string): Promise<ConversationView[]> {
  return db.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: conversationSelect,
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function touchLastMessage(tx: Tx, id: string, at: Date): Promise<void> {
  await tx.conversation.update({ where: { id }, data: { lastMessageAt: at } });
}
