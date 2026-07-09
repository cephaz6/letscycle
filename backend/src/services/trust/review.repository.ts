import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { ReviewView } from './trust.types.js';

type Db = PrismaClient | Tx;

const reviewSelect = {
  id: true,
  transactionId: true,
  reviewerUserId: true,
  revieweeUserId: true,
  rating: true,
  comment: true,
  createdAt: true,
} as const;

export async function insert(
  tx: Tx,
  input: {
    transactionId: string;
    reviewerUserId: string;
    revieweeUserId: string;
    rating: number;
    comment: string | null;
  },
): Promise<ReviewView> {
  return tx.review.create({ data: input, select: reviewSelect });
}

// One review per reviewer per transaction.
export async function findByReviewer(
  db: Db,
  transactionId: string,
  reviewerUserId: string,
): Promise<ReviewView | null> {
  return db.review.findFirst({
    where: { transactionId, reviewerUserId },
    select: reviewSelect,
  });
}

export async function listForReviewee(
  db: Db,
  revieweeUserId: string,
): Promise<ReviewView[]> {
  return db.review.findMany({
    where: { revieweeUserId },
    select: reviewSelect,
    orderBy: { createdAt: 'desc' },
  });
}
