import type { Uuid } from '../../shared/types/common.js';

export type TrustEventType =
  | 'successfulTransaction'
  | 'noShow'
  | 'disputeLost'
  | 'idVerified'
  | 'positiveReview'
  | 'negativeReview'
  | 'flagged';

export type FlagTargetType = 'user' | 'listing' | 'message';
export type FlagStatus = 'open' | 'reviewed' | 'actioned' | 'dismissed';

export interface TrustScoreView {
  userId: Uuid;
  currentScore: number;
  scoreComponents: Record<string, number>;
  lastCalculatedAt: Date;
}

export interface SubmitReviewInput {
  transactionId: Uuid;
  rating: number; // 1-5
  comment?: string | null;
}

export interface ReviewView {
  id: Uuid;
  transactionId: Uuid;
  reviewerUserId: Uuid;
  revieweeUserId: Uuid;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface RaiseFlagInput {
  targetType: FlagTargetType;
  targetId: Uuid;
  reason: string;
  description?: string | null;
}

export interface FlagView {
  id: Uuid;
  targetType: FlagTargetType;
  targetId: Uuid;
  reporterUserId: Uuid;
  reason: string;
  description: string | null;
  status: FlagStatus;
  createdAt: Date;
}
