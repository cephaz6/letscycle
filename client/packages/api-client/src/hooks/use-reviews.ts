'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  reviewsApi,
  type PublicReview,
  type Review,
  type SubmitReviewInput,
} from '../endpoints/reviews';
import { queryKeys } from '../query/keys';

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
      if (revieweeUserId) {
        void qc.invalidateQueries({ queryKey: queryKeys.user.reviews(revieweeUserId) });
        void qc.invalidateQueries({ queryKey: queryKeys.user.public(revieweeUserId) });
      }
    },
  });
}
