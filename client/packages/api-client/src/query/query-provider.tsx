'use client';

import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from '@tanstack/react-query';
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

/** Wraps the app in a per-client QueryClient (one instance per browser tab). */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
