import {
  Bell,
  MessageCircle,
  Receipt,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import type { AppNotification } from '@letscycle/api-client';

interface NotificationMeta {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

/** Map a notification's type + payload to display text and a destination. */
export function notificationMeta(n: AppNotification): NotificationMeta {
  const str = (key: string): string | undefined =>
    typeof n.payload[key] === 'string' ? (n.payload[key] as string) : undefined;

  switch (n.type) {
    case 'messageReceived': {
      const id = str('conversationId');
      return {
        icon: MessageCircle,
        title: 'New message',
        description: 'You have a new message.',
        href: id ? `/messages/${id}` : '/messages',
      };
    }
    case 'transactionUpdate': {
      const id = str('transactionId');
      return {
        icon: Receipt,
        title: 'Order update',
        description: 'There’s an update on one of your orders.',
        href: id ? `/transactions/${id}` : '/transactions',
      };
    }
    case 'matchFound': {
      const id = str('listingId');
      return {
        icon: Sparkles,
        title: 'New match',
        description: 'An item matching your wishlist was found nearby.',
        href: id ? `/listings/${id}` : '/',
      };
    }
    case 'reviewReceived':
      return {
        icon: Star,
        title: 'New review',
        description: 'Someone left you a review.',
        href: '/me',
      };
    case 'system':
    default:
      return {
        icon: Bell,
        title: 'Notice',
        description: str('message') ?? 'You have a new notification.',
        href: '/',
      };
  }
}
