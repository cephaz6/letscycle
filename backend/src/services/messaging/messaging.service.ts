import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import { getListing } from '../listings/index.js';
import * as conversationRepo from './conversation.repository.js';
import * as messageRepo from './message.repository.js';
import type {
  ConversationListItem,
  ConversationView,
  MessageView,
  SendMessageInput,
} from './messaging.types.js';

// Starts (or returns) the buyer's conversation with a listing's seller. The
// caller is always the buyer; the seller is the listing owner.
export async function startConversation(
  userId: string,
  listingId: string,
  db: PrismaClient = getDb(),
): Promise<ConversationView> {
  const listing = await getListing(listingId, db);
  if (listing.sellerId === userId) {
    throw new BadRequestError('You cannot start a conversation on your own listing');
  }

  const existing = await conversationRepo.findExisting(
    db,
    listingId,
    userId,
    listing.sellerId,
  );
  if (existing) return existing;

  return conversationRepo.insert(db, {
    listingId,
    buyerId: userId,
    sellerId: listing.sellerId,
  });
}

export async function listConversations(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<ConversationListItem[]> {
  return conversationRepo.listForUser(db, userId);
}

async function requireParticipant(
  db: PrismaClient,
  conversationId: string,
  userId: string,
): Promise<ConversationView> {
  const conversation = await conversationRepo.findById(db, conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    throw new ForbiddenError('Not a participant in this conversation');
  }
  return conversation;
}

export async function getMessages(
  conversationId: string,
  userId: string,
  limit: number,
  offset: number,
  db: PrismaClient = getDb(),
): Promise<{ items: MessageView[]; total: number; limit: number; offset: number }> {
  await requireParticipant(db, conversationId, userId);
  // Opening the thread marks the counterpart's messages read.
  await messageRepo.markIncomingRead(db, conversationId, userId);
  const { items, total } = await messageRepo.listByConversation(
    db,
    conversationId,
    limit,
    offset,
  );
  return { items, total, limit, offset };
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  input: SendMessageInput,
  db: PrismaClient = getDb(),
): Promise<MessageView> {
  await requireParticipant(db, conversationId, userId);

  return withTransaction(async (tx) => {
    const message = await messageRepo.insert(tx, {
      conversationId,
      senderId: userId,
      body: input.body,
      attachments: input.attachments ?? [],
    });
    await conversationRepo.touchLastMessage(tx, conversationId, message.createdAt);
    await publishEvent(tx, {
      eventType: 'message.sent',
      aggregateType: 'message',
      aggregateId: message.id,
      payload: { messageId: message.id, conversationId, senderId: userId },
    });
    return message;
  }, db);
}
