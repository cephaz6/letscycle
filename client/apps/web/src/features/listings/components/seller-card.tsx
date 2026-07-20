'use client';

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { usePublicProfile } from '@letscycle/api-client';
import { Avatar } from '@/components/avatar';

/** Seller summary row on the listing detail, linking to their public profile. */
export function SellerCard({ sellerId }: { sellerId: string }) {
  const { data: seller } = usePublicProfile(sellerId);

  return (
    <Link
      href={`/u/${sellerId}`}
      className="mt-5 flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/50"
    >
      {seller ? (
        <Avatar
          name={seller.displayName}
          avatarUrl={seller.avatarUrl}
          className="size-10 shrink-0 text-sm"
        />
      ) : (
        <span className="size-10 shrink-0 rounded-full bg-muted" />
      )}
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
