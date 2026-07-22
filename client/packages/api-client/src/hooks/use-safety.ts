'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  safetyApi,
  type MeetPoint,
  type NearbyMeetPointsParams,
  type SafeTransitSession,
  type UpdateSafeTransitInput,
} from '../endpoints/safety';
import { queryKeys } from '../query/keys';

/** Nearby verified meet points. Disabled until a centre point is known. */
export function useMeetPoints(params: NearbyMeetPointsParams | null) {
  return useQuery<MeetPoint[]>({
    queryKey: queryKeys.meetPoints(params ?? { lat: 0, lng: 0 }),
    queryFn: () => safetyApi.listMeetPoints(params as NearbyMeetPointsParams),
    enabled: params !== null,
    staleTime: 5 * 60_000, // meet points barely change
  });
}

export function useStartSafeTransit(transactionId: string) {
  const qc = useQueryClient();
  return useMutation<SafeTransitSession, Error, { liveLocationShareEnabled?: boolean }>({
    mutationFn: (input) => safetyApi.startSafeTransit(transactionId, input),
    onSuccess: (session) => {
      qc.setQueryData(queryKeys.safeTransit(transactionId), session);
    },
  });
}

export function useUpdateSafeTransit(transactionId: string) {
  const qc = useQueryClient();
  return useMutation<
    SafeTransitSession,
    Error,
    { sessionId: string; input: UpdateSafeTransitInput }
  >({
    mutationFn: ({ sessionId, input }) => safetyApi.updateSafeTransit(sessionId, input),
    onSuccess: (session) => {
      qc.setQueryData(queryKeys.safeTransit(transactionId), session);
    },
  });
}

/**
 * The session for a transaction. There is no read endpoint yet, so this is a
 * cache-only entry written by the start/update mutations — it survives
 * navigation within the session but not a reload.
 */
export function useSafeTransitSession(transactionId: string) {
  return useQuery<SafeTransitSession | null>({
    queryKey: queryKeys.safeTransit(transactionId),
    queryFn: () => null,
    enabled: false,
    initialData: null,
  });
}
