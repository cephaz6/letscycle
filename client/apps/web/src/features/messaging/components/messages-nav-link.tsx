'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useConversations } from '@letscycle/api-client';
import { useAuth } from '@/features/auth';

/** Header messages icon with a live unread badge. */
export function MessagesNavLink() {
  const { isAuthenticated } = useAuth();
  const { data } = useConversations({ enabled: isAuthenticated });
  const unread = (data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <Link
      href="/messages"
      aria-label={unread > 0 ? `Messages (${unread} unread)` : 'Messages'}
      className="relative hidden size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:grid"
    >
      <MessageCircle className="size-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-destructive-foreground ring-2 ring-background">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
