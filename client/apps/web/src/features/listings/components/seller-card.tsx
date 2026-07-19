'use client';

import Link from 'next/link';
import { BadgeCheck, UserRound } from 'lucide-react';
import { usePublicProfile } from '@letscycle/api-client';

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Seller summary row on the listing detail, linking to their public profile. */
export function SellerCard({ sellerId }: { sellerId: string }) {
  const { data: seller } = usePublicProfile(sellerId);

  return (
    <Link
      href={`/u/${sellerId}`}
      className="mt-5 flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/50"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {seller ? initials(seller.displayName) : <UserRound className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">
            {seller?.displayName ?? 'Seller'}
          </span>
          {seller?.isEmailVerified && (
            <BadgeCheck className="size-4 shrink-0 text-success" />
          )}
        </span>
        <span className="block text-xs text-muted-foreground">View profile</span>
      </span>
    </Link>
  );
}
