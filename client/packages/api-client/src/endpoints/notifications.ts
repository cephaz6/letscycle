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

export const notificationsApi = {
  /** Latest notifications for the signed-in user (newest first). */
  list(limit = 30, offset = 0): Promise<NotificationsPage> {
    return http.get<NotificationsPage>('/notifications', { query: { limit, offset } });
  },

  /** Mark a single notification read. */
  markRead(id: string): Promise<void> {
    return http.patch<void>(`/notifications/${id}/read`);
  },
};
