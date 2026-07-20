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
  favourites: ['favourites'] as const,
  notifications: ['notifications'] as const,
  user: {
    me: ['user', 'me'] as const,
    public: (id: string) => ['user', 'public', id] as const,
  },
  conversations: ['conversations'] as const,
  messages: (conversationId: string) =>
    ['conversations', conversationId, 'messages'] as const,
  transactions: {
    mine: ['transactions', 'me'] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },
  payoutStatus: ['payouts', 'status'] as const,
};
