'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import {
  resolveImageUrl,
  useConversations,
  useListingDetail,
  usePublicProfile,
  type Conversation,
} from '@letscycle/api-client';
import { cn, Skeleton, Text } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { formatPostedAt } from '@/features/listings/format';
import { Avatar } from '@/components/avatar';

export function ConversationsList() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useConversations();
  const conversations = data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Messages</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <Empty title="Couldn't load messages" subtitle="Please try again shortly." />
      ) : conversations.length === 0 ? (
        <Empty
          title="No messages yet"
          subtitle="When you message a seller or someone messages you, conversations show up here."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {conversations.map((c) => (
            <ConversationRow key={c.id} conversation={c} myId={user?.id} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  myId,
}: {
  conversation: Conversation;
  myId: string | undefined;
}) {
  const otherId =
    conversation.buyerId === myId ? conversation.sellerId : conversation.buyerId;
  const { data: other } = usePublicProfile(otherId);
  const { data: listing } = useListingDetail(conversation.listingId);
  const cover = listing?.photos[0] ? resolveImageUrl(listing.photos[0].key) : null;
  const unread = conversation.unreadCount > 0;

  return (
    <li>
      <Link
        href={`/messages/${conversation.id}`}
        className="flex items-center gap-3 bg-card p-3 transition-colors hover:bg-accent/50"
      >
        <Avatar
          name={other?.displayName ?? ''}
          avatarUrl={other?.avatarUrl}
          className="size-12 shrink-0 text-sm"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">
              {other?.displayName ?? 'Member'}
            </span>
            {conversation.lastMessageAt && (
              <span
                className={cn(
                  'shrink-0 text-xs',
                  unread ? 'font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                {formatPostedAt(conversation.lastMessageAt)}
              </span>
            )}
          </span>
          <span
            className={cn(
              'block truncate text-sm',
              unread ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {listing?.title ?? 'Listing'}
          </span>
        </span>
        {unread && (
          <span className="grid min-w-[20px] shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </span>
        )}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- remote/media photo
          <img src={cover} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
        )}
      </Link>
    </li>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
      <MessageCircle className="size-10 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
    </div>
  );
}
