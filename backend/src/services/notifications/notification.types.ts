import type { Uuid } from '../../shared/types/common.js';

export type NotificationType =
  'matchFound' | 'messageReceived' | 'transactionUpdate' | 'reviewReceived' | 'system';

// Delivery channels. email joins when SES lands (external module, step 15).
export type Channel = 'inApp' | 'webPush';

export const ALL_CHANNELS: Channel[] = ['inApp', 'webPush'];

// Default channels per type when a user has no explicit preference.
export const DEFAULT_CHANNELS: Record<NotificationType, Channel[]> = {
  matchFound: ['inApp', 'webPush'],
  messageReceived: ['inApp', 'webPush'],
  transactionUpdate: ['inApp', 'webPush'],
  reviewReceived: ['inApp'],
  system: ['inApp'],
};

export interface NotificationView {
  id: Uuid;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: Date | null;
  deliveredChannels: string[];
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: Uuid;
  type: NotificationType;
  payload: Record<string, unknown>;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: Record<string, string>;
  userAgent: string;
}

// Values may be explicitly undefined to match Zod's partial() output under
// exactOptionalPropertyTypes; the service skips undefined entries.
export type PreferencesMap = { [K in NotificationType]?: Channel[] | undefined };
