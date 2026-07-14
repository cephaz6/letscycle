import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type {
  Channel,
  NotificationType,
  NotificationView,
  PushSubscriptionInput,
} from './notification.types.js';

type Db = PrismaClient | Tx;

const notificationSelect = {
  id: true,
  type: true,
  payload: true,
  readAt: true,
  deliveredChannels: true,
  createdAt: true,
} as const;

function toView(row: {
  id: string;
  type: NotificationType;
  payload: Prisma.JsonValue;
  readAt: Date | null;
  deliveredChannels: string[];
  createdAt: Date;
}): NotificationView {
  return {
    id: row.id,
    type: row.type,
    payload: (row.payload as Record<string, unknown>) ?? {},
    readAt: row.readAt,
    deliveredChannels: row.deliveredChannels,
    createdAt: row.createdAt,
  };
}

export async function insertNotification(
  db: Db,
  input: {
    userId: string;
    type: NotificationType;
    payload: Record<string, unknown>;
    deliveredChannels: string[];
  },
): Promise<NotificationView> {
  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      payload: input.payload as Prisma.InputJsonValue,
      deliveredChannels: input.deliveredChannels,
    },
    select: notificationSelect,
  });
  return toView(row);
}

export async function listByUser(
  db: Db,
  userId: string,
  limit: number,
  offset: number,
): Promise<{ items: NotificationView[]; total: number }> {
  const [rows, total] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.notification.count({ where: { userId } }),
  ]);
  return { items: rows.map(toView), total };
}

export async function getOwner(db: Db, id: string): Promise<{ userId: string } | null> {
  return db.notification.findUnique({ where: { id }, select: { userId: true } });
}

export async function markRead(db: Db, id: string): Promise<void> {
  await db.notification.update({ where: { id }, data: { readAt: new Date() } });
}

// --- push subscriptions ---

export async function upsertSubscription(
  db: Db,
  userId: string,
  input: PushSubscriptionInput,
): Promise<void> {
  await db.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      keys: input.keys,
      userAgent: input.userAgent,
    },
    // Re-subscribing refreshes keys and clears any prior revocation.
    update: { userId, keys: input.keys, userAgent: input.userAgent, revokedAt: null },
  });
}

export async function activeSubscriptions(
  db: Db,
  userId: string,
): Promise<{ endpoint: string; keys: Record<string, string> }[]> {
  const rows = await db.pushSubscription.findMany({
    where: { userId, revokedAt: null },
    select: { endpoint: true, keys: true },
  });
  return rows.map((r) => ({
    endpoint: r.endpoint,
    keys: (r.keys as Record<string, string>) ?? {},
  }));
}

export async function revokeSubscription(db: Db, endpoint: string): Promise<void> {
  await db.pushSubscription.updateMany({
    where: { endpoint },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(db: Db, userId: string): Promise<void> {
  await db.pushSubscription.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// --- preferences ---

export async function getPreferences(
  db: Db,
  userId: string,
): Promise<{ notificationType: NotificationType; channels: string[] }[]> {
  return db.notificationPreference.findMany({
    where: { userId },
    select: { notificationType: true, channels: true },
  });
}

export async function upsertPreference(
  db: Db,
  userId: string,
  notificationType: NotificationType,
  channels: Channel[],
): Promise<void> {
  await db.notificationPreference.upsert({
    where: { userId_notificationType: { userId, notificationType } },
    create: { userId, notificationType, channels },
    update: { channels },
  });
}

export async function getTransactionParticipants(
  db: Db,
  transactionId: string,
): Promise<{ buyerId: string; sellerId: string; status: string } | null> {
  const rows = await db.$queryRaw<
    { buyerId: string; sellerId: string; status: string }[]
  >`
    SELECT "buyerId", "sellerId", status::text AS status
    FROM "transaction"
    WHERE id = ${transactionId}::uuid
  `;
  return rows[0] ?? null;
}

// Resolves a message to its recipient (the participant who did not send it).
export async function getMessageTarget(
  db: Db,
  messageId: string,
): Promise<{ recipientUserId: string; conversationId: string; senderId: string } | null> {
  const rows = await db.$queryRaw<
    { recipientUserId: string; conversationId: string; senderId: string }[]
  >`
    SELECT
      CASE WHEN c."buyerId" = m."senderId" THEN c."sellerId" ELSE c."buyerId" END
        AS "recipientUserId",
      m."conversationId", m."senderId"
    FROM "message" m
    JOIN "conversation" c ON c.id = m."conversationId"
    WHERE m.id = ${messageId}::uuid
  `;
  return rows[0] ?? null;
}

// Extractable-module read: notifications resolves match candidates to their
// users/listing directly via SQL rather than importing the matching module.
export async function getMatchTargets(
  db: Db,
  candidateIds: string[],
): Promise<
  { matchCandidateId: string; userId: string; listingId: string; listingTitle: string }[]
> {
  if (candidateIds.length === 0) return [];
  return db.$queryRaw`
    SELECT mc.id AS "matchCandidateId", mc."userId", mc."listingId",
           l.title AS "listingTitle"
    FROM "matchCandidate" mc
    JOIN "listing" l ON l.id = mc."listingId"
    WHERE mc.id = ANY(${candidateIds}::uuid[])
  `;
}
