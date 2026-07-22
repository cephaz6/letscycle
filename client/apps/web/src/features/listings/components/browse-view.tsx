'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, PackageOpen, X } from 'lucide-react';
import { useCategories, useInfiniteListings } from '@letscycle/api-client';
import { Button, Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from './listing-card';

const PAGE_SIZE = 10;
/** Ceiling for the home feed — browse the rest through search. */
const MAX_ITEMS = 100;
const NEARBY_RADIUS_KM = 25;

type Coords = { lat: number; lng: number };

/**
 * Asks the browser for a rough position once, without prompting on load: the
 * permission is only requested if it has already been granted, so a first-time
 * visitor sees the randomised feed rather than a permission dialog.
 */
function useOptionalCoords(): { coords: Coords | null; ready: boolean } {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function finish(next: Coords | null): void {
      if (cancelled) return;
      setCoords(next);
      setReady(true);
    }

    if (!navigator.geolocation || !navigator.permissions) {
      finish(null);
      return;
    }
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state !== 'granted') return finish(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => finish(null),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
        );
      })
      .catch(() => finish(null));

    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, ready };
}

/** Deterministic shuffle so the order is stable across re-renders but differs
 *  per visit — keeps the feed from looking identical to everyone. */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function BrowseView() {
  const params = useSearchParams();
  const slug = params.get('category');
  const { data: categories } = useCategories();
  const category = slug ? categories?.find((c) => c.slug === slug) : undefined;

  const { coords, ready } = useOptionalCoords();
  // One seed per mount: a different order each visit, stable while browsing.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));

  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      ...(category && { categoryId: category.id }),
      ...(coords && {
        lat: coords.lat,
        lng: coords.lng,
        radiusKm: NEARBY_RADIUS_KM,
        sort: 'distance' as const,
      }),
    }),
    [category, coords],
  );

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteListings(query);

  const loaded = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  // With a location the API already orders by distance; without one, mix it up.
  const items = useMemo(
    () => (coords ? loaded : shuffle(loaded, seed)).slice(0, MAX_ITEMS),
    [loaded, coords, seed],
  );

  const total = data?.pages[0]?.total ?? 0;
  const canLoadMore = hasNextPage && items.length < MAX_ITEMS;
  const atCap = items.length >= MAX_ITEMS;
  // Hold the grid until we know whether to query by distance, so the first
  // page isn't fetched twice.
  const loading = isLoading || !ready;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="text-xl font-bold tracking-tight">
          {category ? category.name : coords ? 'Near you' : 'Fresh finds in Liverpool'}
        </h1>
        {!loading && !isError && (
          <span className="text-sm font-normal text-muted-foreground">
            {total} item{total === 1 ? '' : 's'}
          </span>
        )}
        {coords && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <MapPin className="size-3" /> Sorted by distance
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
      ) : loading ? (
        <Grid>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
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
        <>
          <Grid>
            {items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </Grid>

          <div className="mt-8 flex flex-col items-center gap-2">
            {canLoadMore ? (
              <Button
                variant="outline"
                className="rounded-full"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading…' : 'See more'}
              </Button>
            ) : (
              <Text muted className="text-center text-sm">
                {atCap
                  ? 'That’s the first 100 — search to narrow things down.'
                  : `You’ve seen all ${items.length}.`}
              </Text>
            )}
            {atCap && (
              <Link
                href="/search"
                className="text-sm font-medium text-primary hover:underline"
              >
                Go to search
              </Link>
            )}
          </div>
        </>
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
