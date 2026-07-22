'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, MessageCircle } from 'lucide-react';
import {
  ApiError,
  useCreateTransaction,
  useStartConversation,
  type ListingType,
} from '@letscycle/api-client';
import { Button, Text } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { ActionExplainerDialog } from './action-explainer-dialog';

/** Primary buy/claim actions on the listing detail. Buy → transaction;
 *  giveaway or "message seller" → conversation. Owners get
 *  OwnerListingControls instead — the page never renders this for them. */
export function ListingActions({
  listingId,
  listingType,
}: {
  listingId: string;
  listingType: ListingType;
}) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const buy = useCreateTransaction();
  const message = useStartConversation();
  const [error, setError] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const isGiveaway = listingType === 'giveaway';
  const loginHref = `/login?next=/listings/${listingId}`;

  async function onBuy() {
    if (!isAuthenticated) return router.push(loginHref);
    setError(null);
    try {
      const tx = await buy.mutateAsync(listingId);
      router.push(`/transactions/${tx.id}`);
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'conflict'
          ? 'Someone is already buying this item.'
          : 'Couldn’t start the order. Please try again.',
      );
    }
  }

  async function onMessage() {
    if (!isAuthenticated) return router.push(loginHref);
    setError(null);
    try {
      const c = await message.mutateAsync(listingId);
      router.push(`/messages/${c.id}`);
    } catch {
      setError('Couldn’t open a chat. Please try again.');
    }
  }

  /** Signed-out visitors go to login; otherwise explain before committing. */
  function openExplainer(): void {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    setExplainerOpen(true);
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      {isGiveaway ? (
        <Button size="lg" className="rounded-full" onClick={openExplainer}>
          <Gift className="size-4" /> Claim this item
        </Button>
      ) : (
        <>
          <Button size="lg" className="rounded-full" onClick={openExplainer}>
            Buy now
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            disabled={message.isPending}
            onClick={() => void onMessage()}
          >
            <MessageCircle className="size-4" /> Message seller
          </Button>
        </>
      )}

      {/* The headline reassurance, visible without opening anything. */}
      <Text muted className="text-center text-xs">
        {isGiveaway
          ? 'Free item — you’ll message the owner to claim it.'
          : 'You won’t be charged yet — payment is only taken after pickup.'}
      </Text>

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
      {!isAuthenticated && (
        <Text muted className="text-center text-xs">
          You’ll need an account — it’s free to join.
        </Text>
      )}

      {isGiveaway ? (
        <ActionExplainerDialog
          open={explainerOpen}
          title="Claiming a free item"
          lead="Giveaways aren’t a checkout — the owner decides who gets it."
          steps={[
            {
              title: 'You message the owner',
              body: 'Say hello and tell them why you’d like it. No payment is involved at any point.',
            },
            {
              title: 'They pick someone',
              body: 'Several people may be interested. If they choose you, it shows up under My orders.',
            },
            {
              title: 'You arrange the handover',
              body: 'Agree a public meet point, collect it, and you both mark it done.',
            },
          ]}
          reassurance="Nothing is reserved by messaging — it’s the owner’s choice."
          confirmLabel="Message the owner"
          pending={message.isPending}
          onConfirm={() => void onMessage()}
          onClose={() => setExplainerOpen(false)}
        />
      ) : (
        <ActionExplainerDialog
          open={explainerOpen}
          title="Before you buy"
          lead="Buying here isn’t like a normal checkout — your money stays put until you’ve seen the item."
          steps={[
            {
              title: 'We hold the payment — we don’t take it',
              body: 'The amount is authorised on your card. Nothing leaves your account yet.',
            },
            {
              title: 'You meet and check the item',
              body: 'Arrange a public meet point with the seller and inspect it in person.',
            },
            {
              title: 'You both confirm the handover',
              body: 'Only then is the payment taken and passed to the seller.',
            },
          ]}
          reassurance="Not as described? Don’t confirm — raise a dispute and the money stays on hold. You can cancel any time before pickup."
          confirmLabel="Continue"
          pending={buy.isPending}
          onConfirm={() => void onBuy()}
          onClose={() => setExplainerOpen(false)}
        />
      )}
    </div>
  );
}
