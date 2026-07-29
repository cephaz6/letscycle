'use client';

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  notificationsApi,
  type AppNotification,
  type NotificationPreferences,
  type NotificationsPage,
} from '../endpoints/notifications';
import { queryKeys } from '../query/keys';

export function useNotifications(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list(30),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    refetchInterval: 60_000, // keep the bell badge fresh
  });
}

const NOTIFICATIONS_PAGE_SIZE = 10;

/** Paged notifications for the full list page — loaded 10 at a time. */
export function useInfiniteNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notificationsInfinite,
    queryFn: ({ pageParam }) => notificationsApi.list(NOTIFICATIONS_PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage: NotificationsPage) => {
      const loaded = lastPage.offset + lastPage.items.length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 30_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => notificationsApi.getPreferences(),
    staleTime: 60_000,
  });
}

/** Optimistic so a switch flips immediately; rolls back if the save fails. */
export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation<
    NotificationPreferences,
    Error,
    NotificationPreferences,
    { prev?: NotificationPreferences }
  >({
    mutationFn: (input) => notificationsApi.updatePreferences(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.notificationPreferences });
      const prev = qc.getQueryData<NotificationPreferences>(
        queryKeys.notificationPreferences,
      );
      qc.setQueryData<NotificationPreferences>(
        queryKeys.notificationPreferences,
        (old) => ({ ...old, ...input }),
      );
      return { prev };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.notificationPreferences, ctx.prev);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(queryKeys.notificationPreferences, prefs);
    },
  });
}

function markReadIn(items: AppNotification[], id: string): AppNotification[] {
  return items.map((n) =>
    n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
  );
}

/** Mark one notification read, optimistically stamping readAt — in both the
 *  bell-badge query and, if loaded, the full paged list on /notifications. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    string,
    { prev?: NotificationsPage; prevInfinite?: InfiniteData<NotificationsPage> }
  >({
    mutationFn: (id) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications });
      await qc.cancelQueries({ queryKey: queryKeys.notificationsInfinite });

      const prev = qc.getQueryData<NotificationsPage>(queryKeys.notifications);
      qc.setQueryData<NotificationsPage>(queryKeys.notifications, (old) =>
        old ? { ...old, items: markReadIn(old.items, id) } : old,
      );

      const prevInfinite = qc.getQueryData<InfiniteData<NotificationsPage>>(
        queryKeys.notificationsInfinite,
      );
      qc.setQueryData<InfiniteData<NotificationsPage>>(
        queryKeys.notificationsInfinite,
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: markReadIn(page.items, id),
                })),
              }
            : old,
      );

      return { prev, prevInfinite };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.notifications, ctx.prev);
      if (ctx?.prevInfinite) {
        qc.setQueryData(queryKeys.notificationsInfinite, ctx.prevInfinite);
      }
    },
  });
}
