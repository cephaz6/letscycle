'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listingsApi,
  type ListingSummary,
  type SearchListingsParams,
  type SearchListingsResult,
} from '../endpoints/listings';
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

export function useFavourites(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.favourites,
    queryFn: () => listingsApi.listFavourites(),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

const EMPTY_FAVS: SearchListingsResult = { items: [], total: 0, limit: 100, offset: 0 };

/** Toggle a listing's favourite state with an optimistic saved-list update. */
export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { listing: ListingSummary; favourite: boolean },
    { prev: SearchListingsResult | undefined }
  >({
    mutationFn: ({ listing, favourite }) =>
      favourite ? listingsApi.favourite(listing.id) : listingsApi.unfavourite(listing.id),
    onMutate: async ({ listing, favourite }) => {
      await qc.cancelQueries({ queryKey: queryKeys.favourites });
      const prev = qc.getQueryData<SearchListingsResult>(queryKeys.favourites);
      qc.setQueryData<SearchListingsResult>(queryKeys.favourites, (old) => {
        const base = old ?? EMPTY_FAVS;
        if (favourite) {
          if (base.items.some((l) => l.id === listing.id)) return base;
          return { ...base, items: [listing, ...base.items], total: base.total + 1 };
        }
        return {
          ...base,
          items: base.items.filter((l) => l.id !== listing.id),
          total: Math.max(0, base.total - 1),
        };
      });
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.favourites, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.favourites });
    },
  });
}
