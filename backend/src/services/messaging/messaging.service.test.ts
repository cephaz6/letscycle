import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import { createListing } from '../listings/index.js';
import {
  getMessages,
  listConversations,
  sendMessage,
  startConversation,
} from './index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const L = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 };

describe.skipIf(!hasDb)('messaging service', () => {
  let sellerId: string;
  let buyerId: string;
  let strangerId: string;
  let categoryId: string;
  let listingId: string;

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `msg-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Msg Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    return user.id;
  }

  beforeAll(async () => {
    const cat = await getDb().category.create({
      data: {
        slug: `msg-cat-${runId}`,
        name: 'Msg Cat',
        typicalDistanceKm: 10,
        iconName: 'x',
      },
      select: { id: true },
    });
    categoryId = cat.id;
    sellerId = await makeUser();
    buyerId = await makeUser();
    strangerId = await makeUser();
    const listing = await createListing({
      sellerId,
      title: 'Oak table',
      description: 'nice',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: 5000,
      location: L,
      publish: true,
    });
    listingId = listing.id;
  });

  afterAll(async () => {
    const db = getDb();
    const ids = [sellerId, buyerId, strangerId];
    const convos = await db.conversation.findMany({
      where: { OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] },
      select: { id: true },
    });
    const convoIds = convos.map((c) => c.id);
    await db.message.deleteMany({ where: { conversationId: { in: convoIds } } });
    await db.conversation.deleteMany({ where: { id: { in: convoIds } } });
    await db.outbox.deleteMany({ where: { aggregateType: 'message' } });
    await db.matchCandidate.deleteMany({ where: { listingId } });
    await db.matchEvent.deleteMany({ where: { listingId } });
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.outbox.deleteMany({ where: { aggregateId: listingId } });
    await db.listing.deleteMany({ where: { id: listingId } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.user.deleteMany({ where: { email: { contains: `msg-${runId}` } } });
    await disconnectDb();
  });

  it('starts a conversation (buyer=caller, seller=listing owner)', async () => {
    const convo = await startConversation(buyerId, listingId);
    expect(convo.buyerId).toBe(buyerId);
    expect(convo.sellerId).toBe(sellerId);
    expect(convo.listingId).toBe(listingId);
  });

  it('is idempotent — returns the existing conversation', async () => {
    const first = await startConversation(buyerId, listingId);
    const second = await startConversation(buyerId, listingId);
    expect(second.id).toBe(first.id);
  });

  it('rejects starting a conversation on your own listing', async () => {
    await expect(startConversation(sellerId, listingId)).rejects.toThrow(BadRequestError);
  });

  it('sends a message, touches the conversation, and emits message.sent', async () => {
    const convo = await startConversation(buyerId, listingId);
    const message = await sendMessage(convo.id, buyerId, { body: 'Is this available?' });

    expect(message.senderId).toBe(buyerId);
    expect(message.body).toBe('Is this available?');

    const conversation = await getDb().conversation.findUnique({
      where: { id: convo.id },
    });
    expect(conversation?.lastMessageAt).not.toBeNull();

    const events = await getDb().outbox.findMany({
      where: { aggregateId: message.id, eventType: 'message.sent' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toMatchObject({
      messageId: message.id,
      conversationId: convo.id,
      senderId: buyerId,
    });
  });

  it('lists conversations for a participant', async () => {
    const convo = await startConversation(buyerId, listingId);
    const buyerList = await listConversations(buyerId);
    const sellerList = await listConversations(sellerId);

    expect(buyerList.some((c) => c.id === convo.id)).toBe(true);
    expect(sellerList.some((c) => c.id === convo.id)).toBe(true);
  });

  it('returns messages and marks the counterpart’s as read', async () => {
    const convo = await startConversation(buyerId, listingId);
    await sendMessage(convo.id, buyerId, { body: 'Hello from buyer' });

    // Seller opens the thread — buyer's message becomes read.
    const page = await getMessages(convo.id, sellerId, 30, 0);
    expect(page.items.some((m) => m.body === 'Hello from buyer')).toBe(true);

    const buyerMessage = await getDb().message.findFirst({
      where: { conversationId: convo.id, senderId: buyerId },
    });
    expect(buyerMessage?.readAt).not.toBeNull();
  });

  it('forbids non-participants from reading or sending', async () => {
    const convo = await startConversation(buyerId, listingId);
    await expect(getMessages(convo.id, strangerId, 30, 0)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(sendMessage(convo.id, strangerId, { body: 'intruder' })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('404s for an unknown conversation', async () => {
    await expect(sendMessage(randomUUID(), buyerId, { body: 'x' })).rejects.toThrow(
      NotFoundError,
    );
  });
});
