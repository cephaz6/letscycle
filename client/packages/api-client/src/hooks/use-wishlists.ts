'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  wishlistsApi,
  type CreateWishlistItemInput,
  type UpdateWishlistItemInput,
  type WishlistItem,
} from '../endpoints/wishlists';
import { queryKeys } from '../query/keys';

export function useWishlist(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.wishlists,
    queryFn: () => wishlistsApi.list(),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useCreateWishlistItem() {
  const qc = useQueryClient();
  return useMutation<WishlistItem, Error, CreateWishlistItemInput>({
    mutationFn: (input) => wishlistsApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishlists });
    },
  });
}

export function useUpdateWishlistItem() {
  const qc = useQueryClient();
  return useMutation<WishlistItem, Error, { id: string; input: UpdateWishlistItemInput }>(
    {
      mutationFn: ({ id, input }) => wishlistsApi.update(id, input),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.wishlists });
      },
    },
  );
}

export function useDeleteWishlistItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => wishlistsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.wishlists });
    },
  });
}
