'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import {
  useConversations,
  useDeleteListing,
  useMyTransactions,
  useUpdateListing,
  type ListingDetail,
} from '@letscycle/api-client';
import { Badge, Button, Text, type BadgeProps } from '@letscycle/ui';
import { Field } from '@/features/auth/form-parts';

/**
 * The owner's view of their own listing detail: inline edit (price +
 * description) and remove. Both are locked once someone has registered
 * interest (a conversation) or started a purchase (a transaction, which also
 * flips the listing to "reserved" server-side) so an active deal can't be
 * changed out from under the other party.
 */
export function OwnerListingControls({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const { data: transactions } = useMyTransactions();
  const { data: conversations } = useConversations();
  const update = useUpdateListing();
  const remove = useDeleteListing();

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGiveaway = listing.listingType === 'giveaway';
  const [price, setPrice] = useState(
    listing.pricePence != null ? (listing.pricePence / 100).toFixed(2) : '',
  );
  const [description, setDescription] = useState(listing.description);

  const hasPurchase = (transactions ?? []).some((t) => t.listingId === listing.id);
  const hasInterest = (conversations ?? []).some((c) => c.listingId === listing.id);
  const isEditableStatus = listing.status === 'draft' || listing.status === 'active';
  const locked = hasPurchase || hasInterest || !isEditableStatus;

  const lockReason = useMemo(() => {
    if (hasPurchase || listing.status === 'reserved') {
      return 'Someone has started buying this item, so it’s locked until the sale completes or is cancelled.';
    }
    if (hasInterest) {
      return 'Someone has messaged you about this item. Editing and removal are locked while there’s interest.';
    }
    if (listing.status === 'completed') return 'This listing has been sold.';
    if (listing.status === 'removed') return 'This listing has been removed.';
    if (listing.status === 'expired') return 'This listing has expired.';
    return 'This listing can’t be edited right now.';
  }, [hasPurchase, hasInterest, listing.status]);

  const pricePence = useMemo(() => {
    const parsed = Number.parseFloat(price);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : NaN;
  }, [price]);

  async function onSave() {
    setError(null);
    const trimmed = description.trim();
    if (trimmed.length < 1) return setError('Add a description.');
    if (!isGiveaway && (!Number.isFinite(pricePence) || pricePence <= 0)) {
      return setError('Enter a valid price.');
    }
    try {
      await update.mutateAsync({
        id: listing.id,
        input: {
          description: trimmed,
          ...(isGiveaway ? {} : { pricePence }),
        },
      });
      setEditing(false);
    } catch {
      setError('Couldn’t save your changes. Please try again.');
    }
  }

  async function onDelete() {
    setError(null);
    try {
      await remove.mutateAsync(listing.id);
      router.push('/me');
    } catch {
      setError('Couldn’t remove the listing. Please try again.');
    }
  }

  const statusBadge: Record<
    ListingDetail['status'],
    { label: string; variant: BadgeProps['variant'] }
  > = {
    draft: { label: 'Draft', variant: 'muted' },
    active: { label: 'Active', variant: 'success' },
    reserved: { label: 'Reserved', variant: 'outline' },
    completed: { label: 'Sold', variant: 'muted' },
    expired: { label: 'Expired', variant: 'muted' },
    removed: { label: 'Removed', variant: 'muted' },
  };
  const badge = statusBadge[listing.status];

  return (
    <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Your listing</p>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {locked ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" />
          {lockReason}
        </p>
      ) : editing ? (
        <div className="mt-4 flex flex-col gap-4">
          {!isGiveaway && (
            <Field label="Price (£)" htmlFor="owner-price">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  £
                </span>
                <input
                  id="owner-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </Field>
          )}
          <Field label="Description" htmlFor="owner-description">
            <textarea
              id="owner-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={update.isPending}
              onClick={() => {
                setEditing(false);
                setError(null);
                setPrice(
                  listing.pricePence != null ? (listing.pricePence / 100).toFixed(2) : '',
                );
                setDescription(listing.description);
              }}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={update.isPending}
              onClick={() => void onSave()}
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      ) : confirmingDelete ? (
        <div className="mt-4">
          <Text muted className="text-sm">
            Remove this listing? It’ll be taken down from browse. This can’t be undone.
          </Text>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={remove.isPending}
              onClick={() => {
                setConfirmingDelete(false);
                setError(null);
              }}
            >
              Keep listing
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={remove.isPending}
              onClick={() => void onDelete()}
            >
              {remove.isPending ? 'Removing…' : 'Remove listing'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="rounded-full sm:flex-1"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" /> Edit listing
          </Button>
          <Button
            variant="ghost"
            className="rounded-full text-destructive hover:text-destructive sm:flex-1"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" /> Remove
          </Button>
        </div>
      )}
    </div>
  );
}
