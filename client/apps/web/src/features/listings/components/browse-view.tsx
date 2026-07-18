'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PackageOpen, X } from 'lucide-react';
import { useCategories, useListings } from '@letscycle/api-client';
import { Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from './listing-card';

export function BrowseView() {
  const params = useSearchParams();
  const slug = params.get('category');

  const { data: categories } = useCategories();
  const category = slug ? categories?.find((c) => c.slug === slug) : undefined;

  const { data, isLoading, isError } = useListings(
    category ? { categoryId: category.id, limit: 40 } : { limit: 40 },
  );
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="text-xl font-bold tracking-tight">
          {category ? category.name : 'Near you in Liverpool'}
        </h1>
        {!isLoading && !isError && (
          <span className="text-sm font-normal text-muted-foreground">
            {data?.total ?? items.length} item{(data?.total ?? 0) === 1 ? '' : 's'}
          </span>
        )}
        {category && (
          <Link
            href="/"
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" /> Clear
          </Link>
        )}
      </div>

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
          title={category ? `Nothing in ${category.name} yet` : 'Nothing here yet'}
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
