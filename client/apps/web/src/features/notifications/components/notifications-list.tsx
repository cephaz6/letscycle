'use client';

import Link from 'next/link';
import { BellOff, CheckCheck } from 'lucide-react';
import {
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
} from '@letscycle/api-client';
import { cn, Skeleton, Text } from '@letscycle/ui';
import { formatPostedAt } from '@/features/listings/format';
import { notificationMeta } from '../notification-meta';

export function NotificationsList() {
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const items = data?.items ?? [];
  const unread = items.filter((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={() => unread.forEach((n) => markRead.mutate(n.id))}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <CheckCheck className="size-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Empty title="Couldn't load notifications" subtitle="Please try again shortly." />
      ) : items.length === 0 ? (
        <Empty
          title="You're all caught up"
          subtitle="Matches, messages and order updates will show up here."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onOpen={() => !n.readAt && markRead.mutate(n.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: () => void;
}) {
  const meta = notificationMeta(notification);
  const Icon = meta.icon;
  const unread = !notification.readAt;

  return (
    <li>
      <Link
        href={meta.href}
        onClick={onOpen}
        className={cn(
          'flex items-start gap-3 p-4 transition-colors hover:bg-accent/50',
          unread ? 'bg-primary/5' : 'bg-card',
        )}
      >
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full',
            unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn('text-sm', unread ? 'font-semibold' : 'font-medium')}>
              {meta.title}
            </span>
            {unread && <span className="size-2 rounded-full bg-primary" />}
          </span>
          <span className="block text-sm text-muted-foreground">{meta.description}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {formatPostedAt(notification.createdAt)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
      <BellOff className="size-10 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
    </div>
  );
}
