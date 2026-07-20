'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type NotificationsPage } from '../endpoints/notifications';
import { queryKeys } from '../query/keys';

export function useNotifications(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list(30),
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    refetchInterval: 30_000, // keep the bell badge fresh
  });
}

/** Mark one notification read, optimistically stamping readAt. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, string, { prev?: NotificationsPage }>({
    mutationFn: (id) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications });
      const prev = qc.getQueryData<NotificationsPage>(queryKeys.notifications);
      qc.setQueryData<NotificationsPage>(queryKeys.notifications, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((n) =>
                n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.notifications, ctx.prev);
    },
  });
}
