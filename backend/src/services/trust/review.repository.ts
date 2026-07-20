import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { PublicReviewView, ReviewView } from './trust.types.js';

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

export async function listForReviewer(
  db: Db,
  reviewerUserId: string,
): Promise<ReviewView[]> {
  return db.review.findMany({
    where: { reviewerUserId },
    select: reviewSelect,
    orderBy: { createdAt: 'desc' },
  });
}

// Public profile: reviews received, each with the reviewer's safe display info.
export async function listForRevieweeWithReviewer(
  db: Db,
  revieweeUserId: string,
): Promise<PublicReviewView[]> {
  const rows = await db.review.findMany({
    where: { revieweeUserId },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      reviewer: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    reviewer: {
      id: r.reviewer.id,
      displayName: r.reviewer.displayName,
      avatarUrl: r.reviewer.avatarUrl,
    },
  }));
}
