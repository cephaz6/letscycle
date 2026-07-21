import { http } from '../http';

export type NotificationType =
  'matchFound' | 'messageReceived' | 'transactionUpdate' | 'reviewReceived' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  deliveredChannels: string[];
  createdAt: string;
}

export interface NotificationsPage {
  items: AppNotification[];
  total: number;
  limit: number;
  offset: number;
}

/** Delivery channels. Web push becomes usable once the PWA ships. */
export type NotificationChannel = 'inApp' | 'webPush';

/** Channels per notification type; a missing type falls back to the defaults. */
export type NotificationPreferences = Partial<
  Record<NotificationType, NotificationChannel[]>
>;

export const notificationsApi = {
  /** Latest notifications for the signed-in user (newest first). */
  list(limit = 30, offset = 0): Promise<NotificationsPage> {
    return http.get<NotificationsPage>('/notifications', { query: { limit, offset } });
  },

  /** Mark a single notification read. */
  markRead(id: string): Promise<void> {
    return http.patch<void>(`/notifications/${id}/read`);
  },

  /** Per-type delivery channels for the signed-in user. */
  getPreferences(): Promise<NotificationPreferences> {
    return http.get<NotificationPreferences>('/notifications/preferences');
  },

  /** Partial update — only the types supplied are changed. */
  updatePreferences(input: NotificationPreferences): Promise<NotificationPreferences> {
    return http.patch<NotificationPreferences>('/notifications/preferences', {
      json: input,
    });
  },
};
