'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useFavourites } from '@letscycle/api-client';
import { buttonVariants, cn, Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from './listing-card';

export function WishlistView() {
  const { data, isLoading, isError } = useFavourites();
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">
        Saved items
        {!isLoading && !isError && (
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {items.length}
          </span>
        )}
      </h1>

      {isLoading ? (
        <Grid>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </Grid>
      ) : isError ? (
        <Empty
          title="Couldn't load your saved items"
          subtitle="Please try again shortly."
        />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <Heart className="size-7" />
          </span>
          <p className="font-semibold">Nothing saved yet</p>
          <Text muted className="max-w-xs text-sm">
            Tap the heart on any listing to save it here for later.
          </Text>
          <Link href="/" className={cn(buttonVariants(), 'mt-1 rounded-full')}>
            Browse listings
          </Link>
        </div>
      ) : (
        <Grid>
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </Grid>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
      <Heart className="size-10 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
    </div>
  );
}
