'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, PackageOpen } from 'lucide-react';
import {
  useCategories,
  useInfiniteListings,
  type SearchListingsParams,
} from '@letscycle/api-client';
import { Button, Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from './listing-card';
import { SearchFilters, useSearchFilters } from './search-filters';

/** £ as typed → integer pence, or undefined when blank/invalid. */
function toPence(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
}

export function SearchView() {
  const filters = useSearchFilters();
  const { data: categories } = useCategories();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categoryId = filters.category
    ? categories?.find((c) => c.slug === filters.category)?.id
    : undefined;
  // Wait for the category lookup before querying, or we'd fetch unfiltered
  // results first and then refetch once categories land.
  const categoryPending = Boolean(filters.category) && !categories;

  const params = useMemo<SearchListingsParams>(
    () => ({
      ...(filters.q.trim() && { keyword: filters.q.trim() }),
      ...(categoryId && { categoryId }),
      ...(filters.type && { listingType: filters.type }),
      ...(toPence(filters.min) !== undefined && { minPricePence: toPence(filters.min) }),
      ...(toPence(filters.max) !== undefined && { maxPricePence: toPence(filters.max) }),
      sort: filters.sort,
      limit: 24,
    }),
    [filters, categoryId],
  );

  const query = useInfiniteListings(params);
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    query;

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const loading = isLoading || categoryPending;

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px' }, // start fetching before it's actually visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const heading = filters.q ? `Results for “${filters.q}”` : 'Search';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{heading}</h1>
        {!loading && !isError && (
          <span className="text-sm text-muted-foreground">
            {total} item{total === 1 ? '' : 's'}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto rounded-full lg:hidden"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal className="size-4" />
          {filtersOpen ? 'Hide filters' : 'Filters'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters — always on desktop, toggled on mobile */}
        <aside
          className={
            filtersOpen
              ? 'lg:sticky lg:top-6 lg:self-start'
              : 'hidden lg:sticky lg:top-6 lg:block lg:self-start'
          }
        >
          <SearchFilters current={filters} />
        </aside>

        <div>
          {isError ? (
            <EmptyState
              title="Couldn’t run that search"
              subtitle="The marketplace is unreachable right now. Please try again shortly."
            />
          ) : loading ? (
            <Grid>
              {Array.from({ length: 12 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </Grid>
          ) : items.length === 0 ? (
            <EmptyState
              title="No matches"
              subtitle="Try fewer filters, a wider price range, or a different keyword."
            />
          ) : (
            <>
              <Grid>
                {items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </Grid>

              {/* Sentinel + next-page state */}
              <div ref={sentinelRef} className="h-px" />
              {isFetchingNextPage && (
                <div className="mt-6">
                  <Grid>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </Grid>
                </div>
              )}
              {!hasNextPage && (
                <Text muted className="mt-8 text-center text-sm">
                  That’s everything — {total} item{total === 1 ? '' : 's'}.
                </Text>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-3/4" />
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
