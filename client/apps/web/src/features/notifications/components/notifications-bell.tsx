'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from '@letscycle/api-client';
import { useAuth } from '@/features/auth';

/** Header bell with a live unread badge. */
export function NotificationsBell() {
  const { isAuthenticated } = useAuth();
  const { data } = useNotifications({ enabled: isAuthenticated });
  const unread = (data?.items ?? []).filter((n) => !n.readAt).length;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
      className="relative grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-destructive-foreground ring-2 ring-background">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
