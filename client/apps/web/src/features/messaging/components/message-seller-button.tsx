'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useStartConversation } from '@letscycle/api-client';
import { buttonVariants, cn } from '@letscycle/ui';
import { useAuth } from '@/features/auth';

/** Listing-detail CTA: starts (or reuses) a conversation with the seller. */
export function MessageSellerButton({
  listingId,
  sellerId,
}: {
  listingId: string;
  sellerId: string;
}) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const start = useStartConversation();
  const [error, setError] = useState(false);

  // Own listing — nothing to message.
  if (isAuthenticated && user?.id === sellerId) return null;

  if (!isAuthenticated) {
    return (
      <Link
        href={`/login?next=/listings/${listingId}`}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'rounded-full',
        )}
      >
        <MessageCircle className="size-4" /> Message seller
      </Link>
    );
  }

  async function onClick() {
    setError(false);
    try {
      const conversation = await start.mutateAsync(listingId);
      router.push(`/messages/${conversation.id}`);
    } catch {
      setError(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={start.isPending}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'w-full rounded-full',
        )}
      >
        <MessageCircle className="size-4" />
        {start.isPending ? 'Opening…' : 'Message seller'}
      </button>
      {error && (
        <p className="mt-1 text-center text-xs text-destructive">
          Couldn’t open the chat. Try again.
        </p>
      )}
    </div>
  );
}
