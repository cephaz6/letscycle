import { http } from '../http';

/** A review shown on a member's public profile (received, with reviewer info). */
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface SubmitReviewInput {
  transactionId: string;
  rating: number;
  comment?: string | null;
}

export interface Review {
  id: string;
  transactionId: string;
  reviewerUserId: string;
  revieweeUserId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export const reviewsApi = {
  /** Public — reviews a user has received. */
  listForUser(userId: string): Promise<PublicReview[]> {
    return http.get<PublicReview[]>(`/users/${userId}/reviews`, { auth: false });
  },

  /** Leave a review for the other party of a completed transaction. */
  submit(input: SubmitReviewInput): Promise<Review> {
    return http.post<Review>('/reviews', { json: input });
  },
};
