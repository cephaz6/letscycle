'use client';

import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ApiError } from '../errors';

const defaultConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry client errors (4xx) — only transient failures.
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
};

export function createQueryClient(): QueryClient {
  return new QueryClient(defaultConfig);
}

// Bump this if a cached query's shape changes incompatibly — stops an old
// sessionStorage entry from a previous build being rehydrated into a client
// that no longer expects it.
const PERSIST_BUSTER = 'v2';

/**
 * Infinite queries (paginated lists like the browse grid or the
 * notifications page) key their second segment 'infinite' by convention —
 * see queryKeys.listings.infinite / queryKeys.notificationsInfinite.
 * Persisting one would restore every page a user had ever scrolled through
 * (e.g. 16 items after one "See more" click) instead of the first page,
 * defeating the "start small, load more on demand" design those lists are
 * built around. Everything else — categories, listing details, favourites —
 * is a plain single-page query and benefits from persistence normally.
 */
function shouldPersist(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[1] !== 'infinite';
}

/**
 * Wraps the app in a per-client QueryClient (one instance per browser tab),
 * persisted to sessionStorage: a reload rehydrates whatever was already
 * fetched instantly and only re-hits the API once staleTime expires, instead
 * of every query starting from zero on every page load.
 *
 * sessionStorage is unavailable during the server render, so that pass falls
 * back to a plain (unpersisted) provider — harmless, since it only matters
 * once the browser takes over.
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient);

  if (typeof window === 'undefined') {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: createSyncStoragePersister({ storage: window.sessionStorage }),
        buster: PERSIST_BUSTER,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && shouldPersist(query),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
