'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import {
  ApiError,
  useCreateTransaction,
  useStartConversation,
  type ListingType,
} from '@letscycle/api-client';
import { Button, Text } from '@letscycle/ui';
import { useAuth } from '@/features/auth';

/** Primary buy/claim actions on the listing detail. Buy → transaction;
 *  giveaway or "message seller" → conversation. */
export function ListingActions({
  listingId,
  sellerId,
  listingType,
}: {
  listingId: string;
  sellerId: string;
  listingType: ListingType;
}) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const buy = useCreateTransaction();
  const message = useStartConversation();
  const [error, setError] = useState<string | null>(null);

  const isGiveaway = listingType === 'giveaway';
  const loginHref = `/login?next=/listings/${listingId}`;

  if (isAuthenticated && user?.id === sellerId) {
    return (
      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        This is your listing — manage it from{' '}
        <Link href="/me" className="font-medium text-primary hover:underline">
          your profile
        </Link>
        .
      </div>
    );
  }

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

  return (
    <div className="mt-5 flex flex-col gap-2">
      {isGiveaway ? (
        <Button
          size="lg"
          className="rounded-full"
          disabled={message.isPending}
          onClick={() => void onMessage()}
        >
          <MessageCircle className="size-4" />
          {message.isPending ? 'Opening…' : 'Message to claim'}
        </Button>
      ) : (
        <>
          <Button
            size="lg"
            className="rounded-full"
            disabled={buy.isPending}
            onClick={() => void onBuy()}
          >
            {buy.isPending ? 'Starting…' : 'Buy now'}
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

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
      {!isAuthenticated && (
        <Text muted className="text-center text-xs">
          You’ll need an account — it’s free to join.
        </Text>
      )}
    </div>
  );
}
