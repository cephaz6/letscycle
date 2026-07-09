import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/httpErrors.js';
import type { PushSender } from './dispatchers/push.types.js';
import { NotificationService } from './notifications.service.js';
import { registerNotificationHandlers } from './handlers.js';
import { InProcessEventBus } from '../../shared/events/bus.js';
import type { AppEvent } from '../../shared/events/schemas.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);

function okSender(): PushSender {
  return { send: vi.fn().mockResolvedValue(true) };
}

// Returns the sender plus its send mock so tests can assert on it without
// tripping the unbound-method lint rule.
function trackedSender() {
  const send = vi.fn().mockResolvedValue(true);
  return { sender: { send } satisfies PushSender, send };
}

describe.skipIf(!hasDb)('notifications service', () => {
  let userId: string;
  let otherId: string;

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `notif-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Notif Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    return user.id;
  }

  beforeAll(async () => {
    userId = await makeUser();
    otherId = await makeUser();
  });

  afterAll(async () => {
    const db = getDb();
    const ids = [userId, otherId];
    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
    await db.notificationPreference.deleteMany({ where: { userId: { in: ids } } });
    await db.outbox.deleteMany({ where: { aggregateType: 'notification' } });
    await db.user.deleteMany({ where: { email: { contains: `notif-${runId}` } } });
    await disconnectDb();
  });

  it('creates an in-app notification and emits notification.dispatched', async () => {
    const service = new NotificationService(okSender(), getDb());

    const notification = await service.createAndDeliver({
      userId,
      type: 'system',
      payload: { message: 'hello' },
    });

    expect(notification.type).toBe('system');
    expect(notification.deliveredChannels).toEqual(['inApp']); // system default
    expect(notification.readAt).toBeNull();

    const events = await getDb().outbox.findMany({
      where: { aggregateId: notification.id, eventType: 'notification.dispatched' },
    });
    expect(events).toHaveLength(1);
  });

  it('delivers web push when the user has a subscription', async () => {
    const { sender, send } = trackedSender();
    const service = new NotificationService(sender, getDb());
    await service.subscribe(userId, {
      endpoint: `https://push.example/${randomUUID()}`,
      keys: { p256dh: 'k', auth: 'a' },
      userAgent: 'test',
    });

    const notification = await service.createAndDeliver({
      userId,
      type: 'matchFound',
      payload: { listingTitle: 'Oak table' },
    });

    expect(send).toHaveBeenCalledOnce();
    expect(notification.deliveredChannels).toEqual(['inApp', 'webPush']);
  });

  it('records only inApp when web push has no subscriptions', async () => {
    const { sender, send } = trackedSender();
    const service = new NotificationService(sender, getDb());

    const notification = await service.createAndDeliver({
      userId: otherId,
      type: 'matchFound',
      payload: { listingTitle: 'Sofa' },
    });

    expect(send).not.toHaveBeenCalled();
    expect(notification.deliveredChannels).toEqual(['inApp']);
  });

  it('revokes a subscription the sender reports as gone', async () => {
    const goneSender: PushSender = { send: vi.fn().mockResolvedValue(false) };
    const service = new NotificationService(goneSender, getDb());
    const endpoint = `https://push.example/${randomUUID()}`;
    await service.subscribe(otherId, {
      endpoint,
      keys: { p256dh: 'k', auth: 'a' },
      userAgent: 'test',
    });

    await service.createAndDeliver({
      userId: otherId,
      type: 'matchFound',
      payload: {},
    });

    const sub = await getDb().pushSubscription.findUnique({ where: { endpoint } });
    expect(sub?.revokedAt).not.toBeNull();
  });

  it('respects notification preferences', async () => {
    const sender = okSender();
    const service = new NotificationService(sender, getDb());
    await service.subscribe(userId, {
      endpoint: `https://push.example/${randomUUID()}`,
      keys: { p256dh: 'k', auth: 'a' },
      userAgent: 'test',
    });
    // Turn matchFound down to in-app only.
    await service.updatePreferences(userId, { matchFound: ['inApp'] });

    const notification = await service.createAndDeliver({
      userId,
      type: 'matchFound',
      payload: {},
    });

    expect(notification.deliveredChannels).toEqual(['inApp']);
    const prefs = await service.getPreferences(userId);
    expect(prefs.matchFound).toEqual(['inApp']);
    expect(prefs.system).toEqual(['inApp']); // unset -> default
  });

  it('lists notifications newest first and marks them read', async () => {
    const service = new NotificationService(okSender(), getDb());
    const created = await service.createAndDeliver({
      userId: otherId,
      type: 'system',
      payload: { n: 1 },
    });

    const page = await service.list(otherId, 20, 0);
    expect(page.items.some((n) => n.id === created.id)).toBe(true);
    expect(page.total).toBeGreaterThanOrEqual(1);

    await service.markRead(created.id, otherId);
    const after = await getDb().notification.findUnique({ where: { id: created.id } });
    expect(after?.readAt).not.toBeNull();
  });

  it('forbids marking someone else’s notification read', async () => {
    const service = new NotificationService(okSender(), getDb());
    const created = await service.createAndDeliver({
      userId,
      type: 'system',
      payload: {},
    });

    await expect(service.markRead(created.id, otherId)).rejects.toThrow(ForbiddenError);
    await expect(service.markRead(randomUUID(), userId)).rejects.toThrow(NotFoundError);
  });

  it('handles match.candidatesFound by notifying each candidate', async () => {
    // Seed a listing + candidate for a fresh buyer.
    const seller = await makeUser();
    const buyer = await makeUser();
    const category = await getDb().category.create({
      data: {
        slug: `notif-cat-${randomUUID().slice(0, 6)}`,
        name: 'c',
        typicalDistanceKm: 10,
        iconName: 'x',
      },
      select: { id: true },
    });
    const listingId = randomUUID();
    await getDb().$executeRaw`
      INSERT INTO "listing" ("id","sellerId","title","description","categoryId",
        condition,"listingType","pricePence",location,"locationAccuracyMetres",status)
      VALUES (${listingId}::uuid, ${seller}::uuid, 'Notif listing', 'd', ${category.id}::uuid,
        'good'::"ListingCondition", 'sell'::"ListingType", 1000,
        ST_SetSRID(ST_MakePoint(-2.99, 53.4), 4326)::geography, 500, 'active'::"ListingStatus")
    `;
    const wish = await getDb().wishlistItem.create({
      data: { userId: buyer, maxDistanceKm: 10 },
      select: { id: true },
    });
    const candidate = await getDb().matchCandidate.create({
      data: {
        listingId,
        wishlistItemId: wish.id,
        userId: buyer,
        compositeScore: 0.9,
        proximityScore: 1,
        keywordScore: 0,
        trustScoreAtMatch: 0.5,
        urgencyScore: 0,
        rank: 1,
        status: 'notified',
      },
      select: { id: true },
    });

    const service = new NotificationService(okSender(), getDb());
    const bus = new InProcessEventBus(() => {});
    registerNotificationHandlers(bus, service);
    const event: AppEvent<'match.candidatesFound'> = {
      eventId: randomUUID(),
      occurredAt: new Date(),
      eventType: 'match.candidatesFound',
      aggregateType: 'listing',
      aggregateId: listingId,
      payload: { listingId, matchCandidateIds: [candidate.id] },
    };
    await bus.publish(event);

    const notifications = await getDb().notification.findMany({
      where: { userId: buyer, type: 'matchFound' },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.payload).toMatchObject({
      listingId,
      listingTitle: 'Notif listing',
    });

    // Cleanup this test's extra rows.
    await getDb().notification.deleteMany({ where: { userId: buyer } });
    await getDb().matchCandidate.deleteMany({ where: { listingId } });
    await getDb().wishlistItem.deleteMany({ where: { userId: buyer } });
    await getDb().listing.deleteMany({ where: { id: listingId } });
    await getDb().category.deleteMany({ where: { id: category.id } });
    await getDb().outbox.deleteMany({ where: { aggregateId: listingId } });
    await getDb().user.deleteMany({ where: { id: { in: [seller, buyer] } } });
  });

  it('handles message.sent by notifying the recipient (not the sender)', async () => {
    const sender = await makeUser();
    const recipient = await makeUser();
    const conversation = await getDb().conversation.create({
      data: { buyerId: sender, sellerId: recipient },
      select: { id: true },
    });
    const message = await getDb().message.create({
      data: { conversationId: conversation.id, senderId: sender, body: 'hi' },
      select: { id: true },
    });

    const service = new NotificationService(okSender(), getDb());
    const bus = new InProcessEventBus(() => {});
    registerNotificationHandlers(bus, service);
    const event: AppEvent<'message.sent'> = {
      eventId: randomUUID(),
      occurredAt: new Date(),
      eventType: 'message.sent',
      aggregateType: 'message',
      aggregateId: message.id,
      payload: {
        messageId: message.id,
        conversationId: conversation.id,
        senderId: sender,
      },
    };
    await bus.publish(event);

    const recipientNotifs = await getDb().notification.findMany({
      where: { userId: recipient, type: 'messageReceived' },
    });
    expect(recipientNotifs).toHaveLength(1);
    expect(recipientNotifs[0]?.payload).toMatchObject({
      conversationId: conversation.id,
    });

    const senderNotifs = await getDb().notification.findMany({
      where: { userId: sender, type: 'messageReceived' },
    });
    expect(senderNotifs).toHaveLength(0);

    await getDb().notification.deleteMany({
      where: { userId: { in: [sender, recipient] } },
    });
    await getDb().message.deleteMany({ where: { conversationId: conversation.id } });
    await getDb().conversation.deleteMany({ where: { id: conversation.id } });
    await getDb().outbox.deleteMany({ where: { aggregateType: 'notification' } });
    await getDb().user.deleteMany({ where: { id: { in: [sender, recipient] } } });
  });
});
