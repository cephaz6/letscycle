'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, SendHorizonal } from 'lucide-react';
import {
  resolveImageUrl,
  useConversations,
  useListingDetail,
  useMessages,
  usePublicProfile,
  useSendMessage,
} from '@letscycle/api-client';
import { Skeleton, Text, cn } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { formatPrice } from '@/features/listings/format';
import { Avatar } from '@/components/avatar';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConversationThread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const { data: conversations } = useConversations();
  const conversation = conversations?.find((c) => c.id === conversationId);

  const otherId =
    conversation &&
    (conversation.buyerId === user?.id ? conversation.sellerId : conversation.buyerId);
  const { data: other } = usePublicProfile(otherId || undefined);
  const { data: listing } = useListingDetail(conversation?.listingId);

  const { data: messages, isLoading } = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  async function onSend() {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft('');
    try {
      await send.mutateAsync(body);
    } catch {
      setDraft(body); // restore on failure
    }
  }

  const cover = listing?.photos[0] ? resolveImageUrl(listing.photos[0].key) : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col px-0 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="grid size-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar
          name={other?.displayName ?? ''}
          avatarUrl={other?.avatarUrl}
          className="size-9 shrink-0 text-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">
            {other?.displayName ?? 'Conversation'}
          </p>
          {listing && (
            <p className="truncate text-xs text-muted-foreground">
              About {listing.title}
            </p>
          )}
        </div>
      </div>

      {/* Listing context */}
      {listing && (
        <Link
          href={`/listings/${listing.id}`}
          className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5 transition-colors hover:bg-muted/60"
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- media photo
            <img src={cover} alt="" className="size-10 rounded-lg object-cover" />
          ) : (
            <span className="size-10 rounded-lg bg-muted" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{listing.title}</span>
            <span className="block text-xs text-muted-foreground">
              {formatPrice(listing.pricePence, listing.listingType)}
            </span>
          </span>
        </Link>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-10 w-3/5 rounded-2xl" />
          </div>
        ) : (messages ?? []).length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <Text muted className="max-w-xs text-sm">
              No messages yet — say hello and arrange a pickup.
            </Text>
          </div>
        ) : (
          (messages ?? []).map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div
                key={m.id}
                className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                    mine
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-muted text-foreground',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-muted-foreground">
                  {formatTime(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            placeholder="Write a message…"
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={!draft.trim() || send.isPending}
            aria-label="Send"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <SendHorizonal className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
