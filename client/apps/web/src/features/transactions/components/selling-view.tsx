'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gift, HandCoins, PackageCheck } from 'lucide-react';
import {
  resolveImageUrl,
  useArrangeGiveaway,
  useCancelTransaction,
  useCompleteTransaction,
  useConfirmTransaction,
  useConversations,
  useListingDetail,
  useListings,
  useMyTransactions,
  usePublicProfile,
  type ListingSummary,
  type Transaction,
} from '@letscycle/api-client';
import { Badge, Button, Skeleton, Text } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { Avatar } from '@/components/avatar';
import { formatPrice } from '@/features/listings/format';
import { LeaveReviewButton } from '@/features/reviews';
import { STATUS_LABEL, statusVariant } from '../status';

const LIVE: Transaction['status'][] = [
  'initiated',
  'paymentAuthorised',
  'paymentCaptured',
  'inEscrow',
  'disputed',
];

export function SellingView() {
  const { user } = useAuth();
  const { data: transactions, isLoading } = useMyTransactions();
  const listings = useListings(user ? { sellerId: user.id, limit: 100 } : {});
  const { data: conversations } = useConversations();

  const sales = (transactions ?? []).filter((t) => t.sellerId === user?.id);
  const live = sales.filter((t) => LIVE.includes(t.status));
  const past = sales.filter((t) => !LIVE.includes(t.status));

  // Free listings that people have messaged about but which have no handover
  // arranged yet — the seller still has to pick someone.
  const claimable = (listings.data?.items ?? []).filter(
    (l) =>
      l.listingType === 'giveaway' &&
      l.status === 'active' &&
      !sales.some((t) => t.listingId === l.id && LIVE.includes(t.status)) &&
      (conversations ?? []).some((c) => c.listingId === l.id),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Selling</h1>
      <Text muted className="mb-6 mt-1 text-sm">
        Move your sales and giveaways along — confirm, hand over, or call it off.
      </Text>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {claimable.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Gift className="size-4 text-primary" /> Someone wants these
              </h2>
              <ul className="space-y-3">
                {claimable.map((l) => (
                  <ClaimantPicker key={l.id} listing={l} />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <HandCoins className="size-4 text-primary" /> In progress
            </h2>
            {live.length === 0 ? (
              <Empty
                title="Nothing in progress"
                subtitle="Sales and handovers you need to action will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {live.map((tx) => (
                  <SaleRow key={tx.id} tx={tx} />
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <PackageCheck className="size-4 text-muted-foreground" /> Done
              </h2>
              <ul className="space-y-3">
                {past.map((tx) => (
                  <SaleRow key={tx.id} tx={tx} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** One sale/handover with whatever the seller can do next. */
function SaleRow({ tx }: { tx: Transaction }) {
  const { data: listing } = useListingDetail(tx.listingId);
  const { data: buyer } = usePublicProfile(tx.buyerId);
  const confirm = useConfirmTransaction(tx.id);
  const complete = useCompleteTransaction(tx.id);
  const cancel = useCancelTransaction(tx.id);
  const [error, setError] = useState<string | null>(null);

  const cover = listing?.photos[0] ? resolveImageUrl(listing.photos[0].key) : null;
  const isFree = tx.amountPence === 0;
  const busy = confirm.isPending || complete.isPending || cancel.isPending;
  const canCancel = tx.status === 'initiated' || tx.status === 'paymentAuthorised';

  function run(action: { mutateAsync: () => Promise<unknown> }, message: string) {
    setError(null);
    action.mutateAsync().catch(() => setError(message));
  }

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- media photo
          <img src={cover} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="size-14 shrink-0 rounded-lg bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/listings/${tx.listingId}`}
              className="truncate font-semibold hover:underline"
            >
              {listing?.title ?? 'Listing'}
            </Link>
            <Badge variant={statusVariant(tx.status)}>{STATUS_LABEL[tx.status]}</Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Avatar
              name={buyer?.displayName ?? ''}
              avatarUrl={buyer?.avatarUrl}
              className="size-5 text-[9px]"
            />
            {buyer?.displayName ?? 'Buyer'} ·{' '}
            {isFree ? 'Free' : formatPrice(tx.amountPence, 'sell')}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {tx.status === 'initiated' && (
              <Button
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() => run(confirm, 'Couldn’t confirm. Please try again.')}
              >
                {confirm.isPending ? 'Confirming…' : 'Confirm order'}
              </Button>
            )}
            {tx.status === 'paymentAuthorised' && (
              <Button
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() =>
                  run(complete, 'Couldn’t confirm pickup. Please try again.')
                }
              >
                {complete.isPending ? 'Confirming…' : 'Confirm pickup'}
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => run(cancel, 'Couldn’t cancel. Please try again.')}
              >
                {cancel.isPending ? 'Cancelling…' : isFree ? 'Call it off' : 'Cancel'}
              </Button>
            )}
            {tx.status === 'completed' && (
              <LeaveReviewButton transactionId={tx.id} counterpartyId={tx.buyerId} />
            )}
            <Link
              href={`/transactions/${tx.id}`}
              className="self-center text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Details
            </Link>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </li>
  );
}

/** A free listing with interest — the seller picks who gets it. */
function ClaimantPicker({ listing }: { listing: ListingSummary }) {
  const { user } = useAuth();
  const { data: conversations } = useConversations();
  const arrange = useArrangeGiveaway();
  const [error, setError] = useState<string | null>(null);

  const interested = (conversations ?? [])
    .filter((c) => c.listingId === listing.id && c.sellerId === user?.id)
    .map((c) => ({ conversationId: c.id, userId: c.buyerId }));

  const cover = resolveImageUrl(listing.coverPhotoKey);

  function give(buyerId: string) {
    setError(null);
    arrange
      .mutateAsync({ listingId: listing.id, buyerId })
      .catch(() => setError('Couldn’t arrange the handover. Please try again.'));
  }

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- media photo
          <img src={cover} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="size-14 shrink-0 rounded-lg bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/listings/${listing.id}`}
            className="truncate font-semibold hover:underline"
          >
            {listing.title}
          </Link>
          <Text muted className="text-sm">
            {interested.length} interested — choose who gets it.
          </Text>

          <ul className="mt-3 space-y-2">
            {interested.map((person) => (
              <ClaimantRow
                key={person.userId}
                userId={person.userId}
                conversationId={person.conversationId}
                disabled={arrange.isPending}
                onGive={() => give(person.userId)}
              />
            ))}
          </ul>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </li>
  );
}

function ClaimantRow({
  userId,
  conversationId,
  disabled,
  onGive,
}: {
  userId: string;
  conversationId: string;
  disabled: boolean;
  onGive: () => void;
}) {
  const { data: person } = usePublicProfile(userId);
  return (
    <li className="flex items-center gap-2 rounded-xl bg-muted/40 p-2">
      <Avatar
        name={person?.displayName ?? ''}
        avatarUrl={person?.avatarUrl}
        className="size-8 text-[10px]"
      />
      <Link
        href={`/u/${userId}`}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
      >
        {person?.displayName ?? 'Member'}
      </Link>
      <Link
        href={`/messages/${conversationId}`}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Chat
      </Link>
      <Button size="sm" className="rounded-full" disabled={disabled} onClick={onGive}>
        Give to them
      </Button>
    </li>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
    </div>
  );
}
