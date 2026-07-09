import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { MessageView } from './messaging.types.js';

type Db = PrismaClient | Tx;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  attachments: true,
  readAt: true,
  createdAt: true,
} as const;

function toView(row: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
}): MessageView {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    attachments: Array.isArray(row.attachments) ? (row.attachments as string[]) : [],
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export async function insert(
  tx: Tx,
  input: {
    conversationId: string;
    senderId: string;
    body: string;
    attachments: string[];
  },
): Promise<MessageView> {
  const row = await tx.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      body: input.body,
      attachments: input.attachments,
    },
    select: messageSelect,
  });
  return toView(row);
}

export async function listByConversation(
  db: Db,
  conversationId: string,
  limit: number,
  offset: number,
): Promise<{ items: MessageView[]; total: number }> {
  const [rows, total] = await Promise.all([
    db.message.findMany({
      where: { conversationId },
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.message.count({ where: { conversationId } }),
  ]);
  return { items: rows.map(toView), total };
}

// Marks the counterpart's unread messages as read for this reader.
export async function markIncomingRead(
  db: Db,
  conversationId: string,
  readerUserId: string,
): Promise<void> {
  await db.message.updateMany({
    where: { conversationId, senderId: { not: readerUserId }, readAt: null },
    data: { readAt: new Date() },
  });
}
