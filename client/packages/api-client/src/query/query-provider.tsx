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
const PERSIST_BUSTER = 'v1';

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
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
