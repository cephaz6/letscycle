'use client';

import Link from 'next/link';
import { Receipt } from 'lucide-react';
import {
  resolveImageUrl,
  useListingDetail,
  useMyTransactions,
  type Transaction,
} from '@letscycle/api-client';
import { Badge, Skeleton, Text } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { formatPrice } from '@/features/listings/format';
import { LeaveReviewButton } from '@/features/reviews';
import { STATUS_LABEL, statusVariant } from '../status';

export function OrdersList() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useMyTransactions();
  // Purchases only — sales are actioned on /selling.
  const orders = (data ?? []).filter((tx) => tx.buyerId === user?.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Your orders</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Empty title="Couldn't load your orders" subtitle="Please try again shortly." />
      ) : orders.length === 0 ? (
        <Empty
          title="No orders yet"
          subtitle="Things you buy show up here. Selling something? Check Selling."
        />
      ) : (
        <ul className="space-y-2">
          {orders.map((tx) => (
            <OrderRow key={tx.id} tx={tx} myId={user?.id} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ tx, myId }: { tx: Transaction; myId: string | undefined }) {
  const { data: listing } = useListingDetail(tx.listingId);
  const cover = listing?.photos[0] ? resolveImageUrl(listing.photos[0].key) : null;
  const isSeller = tx.sellerId === myId;

  return (
    <li>
      <Link
        href={`/transactions/${tx.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent/40"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- media photo
          <img src={cover} alt="" className="size-14 rounded-xl object-cover" />
        ) : (
          <span className="size-14 rounded-xl bg-muted" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <Badge variant={isSeller ? 'secondary' : 'outline'} className="shrink-0">
              {isSeller ? 'Selling' : 'Buying'}
            </Badge>
            <span className="truncate font-semibold">{listing?.title ?? 'Listing'}</span>
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {formatPrice(tx.amountPence)}
          </span>
        </span>
        <Badge variant={statusVariant(tx.status)} className="shrink-0">
          {STATUS_LABEL[tx.status]}
        </Badge>
      </Link>
      {tx.status === 'completed' && (
        <div className="mt-2 pl-3">
          <LeaveReviewButton transactionId={tx.id} counterpartyId={tx.sellerId} />
        </div>
      )}
    </li>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
      <Receipt className="size-10 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
    </div>
  );
}
