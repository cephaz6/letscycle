'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messagesApi, type Conversation, type Message } from '../endpoints/messages';
import { usersApi, type PublicProfile } from '../endpoints/users';
import { listingsApi, type ListingDetail } from '../endpoints/listings';
import { queryKeys } from '../query/keys';

export function useConversations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => messagesApi.listConversations(),
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    refetchInterval: 20_000, // keep the unread badge fresh
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => messagesApi.getMessages(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 5000, // light polling for near-realtime
  });
}

/** Public profile lookup (cached) — used to name the other party in threads. */
export function usePublicProfile(userId: string | undefined) {
  return useQuery<PublicProfile>({
    queryKey: queryKeys.user.public(userId ?? 'none'),
    queryFn: () => usersApi.getById(userId as string),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
}

/** Cached listing detail — used for the conversation's listing context. */
export function useListingDetail(listingId: string | null | undefined) {
  return useQuery<ListingDetail>({
    queryKey: queryKeys.listings.detail(listingId ?? 'none'),
    queryFn: () => listingsApi.getById(listingId as string),
    enabled: Boolean(listingId),
    staleTime: 60_000,
  });
}

export function useStartConversation() {
  return useMutation<Conversation, Error, string>({
    mutationFn: (listingId) => messagesApi.startConversation(listingId),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation<Message, Error, string>({
    mutationFn: (body) => messagesApi.sendMessage(conversationId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
