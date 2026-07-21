'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listingsApi,
  type ListingDetail,
  type ListingSummary,
  type SearchListingsParams,
  type SearchListingsResult,
} from '../endpoints/listings';
import { queryKeys } from '../query/keys';

type UpdateListingInput = Parameters<typeof listingsApi.update>[1];

export function useListings(params: SearchListingsParams = {}) {
  return useQuery({
    queryKey: queryKeys.listings.search(params),
    queryFn: () => listingsApi.search(params),
  });
}

/**
 * Paged search for infinite scroll. Pages are offset-based; the next page is
 * requested only when the caller asks (fetchNextPage), so scrolling costs one
 * request per page rather than refetching the whole result set.
 */
export function useInfiniteListings(params: SearchListingsParams = {}) {
  const limit = params.limit ?? 24;
  return useInfiniteQuery({
    queryKey: queryKeys.listings.infinite({ ...params, limit }),
    queryFn: ({ pageParam }) =>
      listingsApi.search({ ...params, limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: SearchListingsResult) => {
      const loaded = lastPage.offset + lastPage.items.length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 30_000,
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

/** Update a listing (price, description, status…). Owner only. */
export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation<ListingDetail, Error, { id: string; input: UpdateListingInput }>({
    mutationFn: ({ id, input }) => listingsApi.update(id, input),
    onSuccess: (listing) => {
      qc.setQueryData(queryKeys.listings.detail(listing.id), listing);
      void qc.invalidateQueries({ queryKey: ['listings', 'search'] });
    },
  });
}

/** Soft-remove a listing. Owner only. */
export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => listingsApi.remove(id),
    onSuccess: (_v, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.listings.detail(id) });
      void qc.invalidateQueries({ queryKey: ['listings', 'search'] });
      void qc.invalidateQueries({ queryKey: queryKeys.favourites });
    },
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
