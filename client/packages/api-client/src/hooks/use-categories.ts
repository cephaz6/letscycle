'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../endpoints/categories';
import { queryKeys } from '../query/keys';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoriesApi.list(),
    staleTime: 60 * 60_000, // categories change rarely
  });
}
