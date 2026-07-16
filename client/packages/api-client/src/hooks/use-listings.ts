'use client';

import { useQuery } from '@tanstack/react-query';
import { listingsApi, type SearchListingsParams } from '../endpoints/listings';
import { queryKeys } from '../query/keys';

export function useListings(params: SearchListingsParams = {}) {
  return useQuery({
    queryKey: queryKeys.listings.search(params),
    queryFn: () => listingsApi.search(params),
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: queryKeys.listings.detail(id),
    queryFn: () => listingsApi.getById(id),
    enabled: Boolean(id),
  });
}
