'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  MessageCircle,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import {
  resolveImageUrl,
  useCompleteTransaction,
  useConfirmTransaction,
  useDisputeTransaction,
  useListingDetail,
  useOnboardPayouts,
  usePayoutStatus,
  usePublicProfile,
  useStartConversation,
  useTransaction,
} from '@letscycle/api-client';
import { Badge, Button, Skeleton, Text, cn } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { formatPrice } from '@/features/listings/format';
import { LeaveReviewButton } from '@/features/reviews';
import { SafeTransitPanel } from '@/features/safety';
import { STATUS_LABEL, STEPS, currentStep, nextStep, statusVariant } from '../status';

export function OrderView({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: tx, isLoading, isError } = useTransaction(id);
  const { data: listing } = useListingDetail(tx?.listingId);
  const otherId = tx && (tx.buyerId === user?.id ? tx.sellerId : tx.buyerId);
  const { data: other } = usePublicProfile(otherId || undefined);

  if (isLoading) return <OrderSkeleton />;
  if (isError || !tx) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg font-semibold">Order not found</p>
        <Link href="/transactions" className="mt-3 inline-block text-sm text-primary">
          Back to your orders
        </Link>
      </div>
    );
  }

  const isSeller = user?.id === tx.sellerId;
  const step = currentStep(tx.status);
  const cover = listing?.photos[0] ? resolveImageUrl(listing.photos[0].key) : null;
  const otherName = other?.displayName ?? (isSeller ? 'the buyer' : 'the seller');

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        href="/transactions"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Your orders
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {isSeller ? 'Sale' : 'Order'}
        </h1>
        <Badge variant={statusVariant(tx.status)}>{STATUS_LABEL[tx.status]}</Badge>
      </div>

      {/* Listing */}
      {listing && (
        <Link
          href={`/listings/${listing.id}`}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent/40"
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- media photo
            <img src={cover} alt="" className="size-16 rounded-xl object-cover" />
          ) : (
            <span className="size-16 rounded-xl bg-muted" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{listing.title}</span>
            <span className="block text-sm text-muted-foreground">with {otherName}</span>
          </span>
        </Link>
      )}

      {/* Whose move it is, in one line — the stepper shows where, not what next. */}
      {nextStep(tx.status, isSeller) && (
        <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-foreground">
          {nextStep(tx.status, isSeller)}
        </p>
      )}

      {/* Stepper */}
      <Stepper step={step} status={tx.status} />

      {/* Amount */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Payment</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Line label="Item price">{formatPrice(tx.amountPence)}</Line>
          {isSeller ? (
            <>
              <Line label="Platform fee" muted>
                −{formatPrice(tx.commissionPence)}
              </Line>
              <Line label="You receive" bold>
                {formatPrice(tx.amountPence - tx.commissionPence)}
              </Line>
            </>
          ) : (
            <Line label="You pay" bold>
              {formatPrice(tx.amountPence)}
            </Line>
          )}
        </dl>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" /> Payment is held securely and
          only released to the seller once you both confirm pickup.
        </p>
      </div>

      {/* Actions */}
      <ActionsPanel
        tx={tx}
        isSeller={isSeller}
        otherName={otherName}
        counterpartyId={otherId || undefined}
      />

      {/* Message */}
      {otherId && <MessageLink listingId={tx.listingId} label={`Message ${otherName}`} />}
    </div>
  );
}

function Stepper({ step, status }: { step: number; status: string }) {
  if (step === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        This order is {status}.
      </div>
    );
  }
  return (
    <ol className="mt-6 flex items-center">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-full text-xs font-bold',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary/15 text-primary ring-2 ring-primary',
                  !done && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" /> : n}
              </span>
              <span
                className={cn(
                  'text-center text-[11px]',
                  active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {n < STEPS.length && (
              <span
                className={cn(
                  'mx-1 h-0.5 flex-1 rounded-full',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ActionsPanel({
  tx,
  isSeller,
  otherName,
  counterpartyId,
}: {
  tx: { id: string; status: string };
  isSeller: boolean;
  otherName: string;
  counterpartyId?: string;
}) {
  const confirm = useConfirmTransaction(tx.id);
  const complete = useCompleteTransaction(tx.id);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);

  if (tx.status === 'initiated') {
    return (
      <Panel>
        {isSeller ? (
          <>
            <PayoutNudge />
            <p className="text-sm text-muted-foreground">
              {otherName} wants to buy this. Confirm to reserve it and authorise their
              payment.
            </p>
            <Button
              className="mt-3 w-full rounded-full"
              disabled={confirm.isPending}
              onClick={() => confirm.mutate()}
            >
              {confirm.isPending ? 'Confirming…' : 'Confirm order'}
            </Button>
            {confirm.isError && <ActionError />}
          </>
        ) : (
          <WaitingRow text={`Waiting for ${otherName} to confirm your order.`} />
        )}
      </Panel>
    );
  }

  if (tx.status === 'paymentAuthorised') {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">
          Meet up and hand over the item. Both of you confirm pickup to release the
          payment.
        </p>
        {pickupConfirmed ? (
          <WaitingRow text={`You've confirmed. Waiting for ${otherName}.`} />
        ) : (
          <Button
            className="mt-3 w-full rounded-full"
            disabled={complete.isPending}
            onClick={() =>
              complete.mutate(undefined, { onSuccess: () => setPickupConfirmed(true) })
            }
          >
            {complete.isPending ? 'Confirming…' : 'Confirm pickup'}
          </Button>
        )}
        {complete.isError && <ActionError />}
        <SafeTransitPanel transactionId={tx.id} />
        <DisputeSection transactionId={tx.id} />
      </Panel>
    );
  }

  if (tx.status === 'paymentCaptured' || tx.status === 'inEscrow') {
    return (
      <Panel>
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-5 text-primary" />
          Pickup confirmed — funds are in escrow and release to the seller shortly.
        </div>
        <DisputeSection transactionId={tx.id} />
      </Panel>
    );
  }

  if (tx.status === 'completed') {
    return (
      <Panel>
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <Check className="size-5" /> Order complete. Thanks for keeping things in the
          loop!
        </div>
        {counterpartyId && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              How did it go with {otherName}?
            </p>
            <LeaveReviewButton transactionId={tx.id} counterpartyId={counterpartyId} />
          </div>
        )}
      </Panel>
    );
  }

  return null;
}

function PayoutNudge() {
  const { data: status } = usePayoutStatus();
  const onboard = useOnboardPayouts();
  if (!status || status.payoutsEnabled) return null;
  return (
    <div className="mb-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Wallet className="size-4" /> Set up payouts to get paid
      </p>
      <Text muted className="mt-1 text-xs">
        You’ll need a payout account to receive money from sales.
      </Text>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 rounded-full"
        disabled={onboard.isPending}
        onClick={() => onboard.mutate()}
      >
        {onboard.isPending ? 'Setting up…' : 'Set up payouts'}
      </Button>
    </div>
  );
}

function DisputeSection({ transactionId }: { transactionId: string }) {
  const dispute = useDisputeTransaction(transactionId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  if (dispute.isSuccess) {
    return (
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Your report has been submitted. We’ll take a look.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive"
      >
        <TriangleAlert className="size-3.5" /> Report a problem
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        dispute.mutate({ reason: reason.trim(), description: description.trim() });
      }}
      className="mt-3 space-y-2 rounded-xl border border-border p-3"
    >
      <input
        required
        maxLength={200}
        placeholder="Reason (e.g. item not as described)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <textarea
        required
        rows={3}
        maxLength={5000}
        placeholder="What went wrong?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          className="rounded-full"
          disabled={dispute.isPending}
        >
          {dispute.isPending ? 'Submitting…' : 'Submit report'}
        </Button>
      </div>
    </form>
  );
}

function MessageLink({ listingId, label }: { listingId: string; label: string }) {
  const start = useStartConversation();
  return (
    <button
      type="button"
      disabled={start.isPending}
      onClick={() =>
        start.mutate(listingId, {
          onSuccess: (c) => {
            window.location.href = `/messages/${c.id}`;
          },
        })
      }
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-medium transition-colors hover:bg-accent"
    >
      <MessageCircle className="size-4" /> {label}
    </button>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5">{children}</div>
  );
}

function Line({
  label,
  children,
  bold,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn(bold && 'text-base font-bold', muted && 'text-muted-foreground')}>
        {children}
      </dd>
    </div>
  );
}

function WaitingRow({ text }: { text: string }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
      <span className="size-2 animate-pulse rounded-full bg-primary" />
      {text}
    </div>
  );
}

function ActionError() {
  return (
    <p className="mt-2 text-center text-xs text-destructive">
      Something went wrong. Please try again.
    </p>
  );
}

function OrderSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
