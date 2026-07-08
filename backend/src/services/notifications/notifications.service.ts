import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/httpErrors.js';
import * as repo from './notification.repository.js';
import { dispatchWebPush } from './dispatchers/webPush.js';
import type { PushMessage, PushSender } from './dispatchers/push.types.js';
import {
  ALL_CHANNELS,
  DEFAULT_CHANNELS,
  type Channel,
  type CreateNotificationInput,
  type NotificationType,
  type NotificationView,
  type PreferencesMap,
  type PushSubscriptionInput,
} from './notification.types.js';

function buildPushMessage(
  type: NotificationType,
  payload: Record<string, unknown>,
): PushMessage {
  if (type === 'matchFound') {
    const title =
      typeof payload['listingTitle'] === 'string' ? payload['listingTitle'] : '';
    return {
      title: 'New match found',
      body: title
        ? `A listing matches your wishlist: ${title}`
        : 'A listing matches your wishlist',
      data: payload,
    };
  }
  return { title: 'LetsCycle', body: 'You have a new notification', data: payload };
}

function isChannel(value: string): value is Channel {
  return (ALL_CHANNELS as string[]).includes(value);
}

export class NotificationService {
  constructor(
    private readonly pushSender: PushSender,
    private readonly db: PrismaClient = getDb(),
  ) {}

  // Fan-out for match.candidatesFound: one matchFound notification per candidate.
  async handleMatchCandidates(candidateIds: string[]): Promise<{ notified: number }> {
    const targets = await repo.getMatchTargets(this.db, candidateIds);
    for (const target of targets) {
      await this.createAndDeliver({
        userId: target.userId,
        type: 'matchFound',
        payload: {
          listingId: target.listingId,
          listingTitle: target.listingTitle,
          matchCandidateId: target.matchCandidateId,
        },
      });
    }
    return { notified: targets.length };
  }

  // Resolves channels, delivers out-of-band (web push), then persists the
  // notification and emits notification.dispatched atomically.
  async createAndDeliver(input: CreateNotificationInput): Promise<NotificationView> {
    const channels = await this.resolveChannels(input.userId, input.type);
    const delivered: Channel[] = [];

    if (channels.includes('inApp')) {
      delivered.push('inApp');
    }
    if (channels.includes('webPush')) {
      const ok = await dispatchWebPush(
        this.db,
        this.pushSender,
        input.userId,
        buildPushMessage(input.type, input.payload),
      );
      if (ok) delivered.push('webPush');
    }

    return withTransaction(async (tx) => {
      const notification = await repo.insertNotification(tx, {
        userId: input.userId,
        type: input.type,
        payload: input.payload,
        deliveredChannels: delivered,
      });
      await publishEvent(tx, {
        eventType: 'notification.dispatched',
        aggregateType: 'notification',
        aggregateId: notification.id,
        payload: {
          notificationId: notification.id,
          userId: input.userId,
          channels: delivered,
        },
      });
      return notification;
    }, this.db);
  }

  async list(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{
    items: NotificationView[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { items, total } = await repo.listByUser(this.db, userId, limit, offset);
    return { items, total, limit, offset };
  }

  async markRead(id: string, userId: string): Promise<void> {
    const owner = await repo.getOwner(this.db, id);
    if (!owner) {
      throw new NotFoundError('Notification not found');
    }
    if (owner.userId !== userId) {
      throw new ForbiddenError('Not your notification');
    }
    await repo.markRead(this.db, id);
  }

  async subscribe(userId: string, input: PushSubscriptionInput): Promise<void> {
    await repo.upsertSubscription(this.db, userId, input);
  }

  async getPreferences(userId: string): Promise<Record<NotificationType, Channel[]>> {
    const rows = await repo.getPreferences(this.db, userId);
    const result = { ...DEFAULT_CHANNELS };
    for (const row of rows) {
      result[row.notificationType] = row.channels.filter(isChannel);
    }
    return result;
  }

  async updatePreferences(
    userId: string,
    updates: PreferencesMap,
  ): Promise<Record<NotificationType, Channel[]>> {
    for (const [type, channels] of Object.entries(updates)) {
      if (channels) {
        await repo.upsertPreference(this.db, userId, type as NotificationType, channels);
      }
    }
    return this.getPreferences(userId);
  }

  private async resolveChannels(
    userId: string,
    type: NotificationType,
  ): Promise<Channel[]> {
    const rows = await repo.getPreferences(this.db, userId);
    const pref = rows.find((r) => r.notificationType === type);
    if (pref) {
      return pref.channels.filter(isChannel);
    }
    return DEFAULT_CHANNELS[type];
  }
}
