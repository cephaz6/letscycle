'use client';

import { PackageOpen } from 'lucide-react';
import { useListings } from '@letscycle/api-client';
import { Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from './listing-card';

export function BrowseView() {
  const { data, isLoading, isError } = useListings({ limit: 40 });
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-xl font-bold tracking-tight">
        Near you in Liverpool
        {!isLoading && !isError && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {data?.total ?? items.length} item{(data?.total ?? 0) === 1 ? '' : 's'}
          </span>
        )}
      </h1>

      {isError ? (
        <EmptyState
          title="Couldn't load listings"
          subtitle="The marketplace is unreachable right now. Please try again shortly."
        />
      ) : isLoading ? (
        <Grid>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          subtitle="Be the first to list something in your area."
        />
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

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-20 text-center">
      <PackageOpen className="size-10 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
    </div>
  );
}
