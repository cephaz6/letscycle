import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { ConversationListItem, ConversationView } from './messaging.types.js';

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

export async function listForUser(
  db: Db,
  userId: string,
): Promise<ConversationListItem[]> {
  const rows = await db.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: {
      ...conversationSelect,
      // Unread = messages from the other party the caller hasn't read.
      _count: {
        select: {
          messages: { where: { senderId: { not: userId }, readAt: null } },
        },
      },
    },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    unreadCount: _count.messages,
  }));
}

export async function touchLastMessage(tx: Tx, id: string, at: Date): Promise<void> {
  await tx.conversation.update({ where: { id }, data: { lastMessageAt: at } });
}
