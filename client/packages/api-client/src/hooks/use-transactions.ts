'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  transactionsApi,
  type PayoutStatus,
  type Transaction,
} from '../endpoints/transactions';
import { queryKeys } from '../query/keys';

export function useMyTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions.mine,
    queryFn: () => transactionsApi.listMine(),
    staleTime: 15_000,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => transactionsApi.getById(id),
    enabled: Boolean(id),
    refetchInterval: 5000, // reflect the counterpart's actions promptly
  });
}

export function useCreateTransaction() {
  return useMutation<Transaction, Error, string>({
    mutationFn: (listingId) => transactionsApi.create(listingId),
  });
}

function useTxAction(id: string, action: (id: string) => Promise<Transaction>) {
  const qc = useQueryClient();
  return useMutation<Transaction, Error, void>({
    mutationFn: () => action(id),
    onSuccess: (tx) => {
      qc.setQueryData(queryKeys.transactions.detail(id), tx);
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.mine });
    },
  });
}

export function useConfirmTransaction(id: string) {
  return useTxAction(id, (tid) => transactionsApi.confirm(tid));
}

export function useCompleteTransaction(id: string) {
  return useTxAction(id, (tid) => transactionsApi.complete(tid));
}

export function useDisputeTransaction(id: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { reason: string; description: string }>({
    mutationFn: (input) => transactionsApi.dispute(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
    },
  });
}

export function usePayoutStatus() {
  return useQuery<PayoutStatus>({
    queryKey: queryKeys.payoutStatus,
    queryFn: () => transactionsApi.payouts.status(),
    staleTime: 60_000,
  });
}

export function useOnboardPayouts() {
  const qc = useQueryClient();
  return useMutation<{ url: string }, Error, void>({
    mutationFn: () => transactionsApi.payouts.onboard(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payoutStatus });
    },
  });
}
