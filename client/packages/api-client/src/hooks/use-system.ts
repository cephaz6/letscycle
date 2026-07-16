'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { systemApi, type TermsAcceptance } from '../endpoints/system';
import { queryKeys } from '../query/keys';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.system.health,
    queryFn: () => systemApi.health(),
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: queryKeys.system.publicSettings,
    queryFn: () => systemApi.publicSettings(),
    staleTime: 5 * 60_000, // settings change rarely
  });
}

export function useCurrentTerms() {
  return useQuery({
    queryKey: queryKeys.system.currentTerms,
    queryFn: () => systemApi.currentTerms(),
    staleTime: 60 * 60_000,
  });
}

export function useAcceptCurrentTerms() {
  return useMutation<TermsAcceptance, Error>({
    mutationFn: () => systemApi.acceptCurrentTerms(),
  });
}
