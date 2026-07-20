'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesApi, type MatchInterestResult } from '../endpoints/matches';
import { queryKeys } from '../query/keys';

/** Express interest in a match candidate (from a matchFound notification). */
export function useExpressInterest() {
  const qc = useQueryClient();
  return useMutation<MatchInterestResult, Error, string>({
    mutationFn: (candidateId) => matchesApi.expressInterest(candidateId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
