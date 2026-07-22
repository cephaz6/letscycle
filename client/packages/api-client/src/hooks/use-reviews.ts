'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  reviewsApi,
  type MyReviews,
  type PublicReview,
  type Review,
  type SubmitReviewInput,
} from '../endpoints/reviews';
import { queryKeys } from '../query/keys';

/** The caller's own reviews — check `given` to see if an order is reviewed. */
export function useMyReviews(options?: { enabled?: boolean }) {
  return useQuery<MyReviews>({
    queryKey: queryKeys.user.myReviews,
    queryFn: () => reviewsApi.listMine(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

/** Public — reviews a user has received. */
export function useUserReviews(userId: string | undefined) {
  return useQuery<PublicReview[]>({
    queryKey: queryKeys.user.reviews(userId ?? 'none'),
    queryFn: () => reviewsApi.listForUser(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

/** Leave a review; refreshes the reviewed user's reviews and profile stats. */
export function useSubmitReview(revieweeUserId?: string) {
  const qc = useQueryClient();
  return useMutation<Review, Error, SubmitReviewInput>({
    mutationFn: (input) => reviewsApi.submit(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.user.myReviews });
      if (revieweeUserId) {
        void qc.invalidateQueries({ queryKey: queryKeys.user.reviews(revieweeUserId) });
        void qc.invalidateQueries({ queryKey: queryKeys.user.public(revieweeUserId) });
      }
    },
  });
}
