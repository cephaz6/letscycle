import type { SearchListingsParams } from '../endpoints/listings';

/** Centralised query keys so features invalidate consistently. */
export const queryKeys = {
  system: {
    health: ['system', 'health'] as const,
    publicSettings: ['system', 'publicSettings'] as const,
    currentTerms: ['system', 'currentTerms'] as const,
  },
  categories: ['categories'] as const,
  listings: {
    search: (params: SearchListingsParams) => ['listings', 'search', params] as const,
    detail: (id: string) => ['listings', 'detail', id] as const,
  },
};
