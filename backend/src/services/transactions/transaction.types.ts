import type { Uuid } from '../../shared/types/common.js';

export type TransactionStatus =
  | 'initiated'
  | 'paymentAuthorised'
  | 'paymentCaptured'
  | 'inEscrow'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type PayoutOnboardingStatus = 'pending' | 'complete' | 'restricted';

export type DisputeStatus =
  'open' | 'underReview' | 'resolvedBuyer' | 'resolvedSeller' | 'closed';

export interface TransactionView {
  id: Uuid;
  listingId: Uuid;
  buyerId: Uuid;
  sellerId: Uuid;
  amountPence: number;
  commissionPence: number;
  currency: string;
  status: TransactionStatus;
  meetPointId: Uuid | null;
  agreedPickupAt: Date | null;
  completedAt: Date | null;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  buyerId: Uuid;
  listingId: Uuid;
  agreedPickupAt?: Date | null;
}

export interface DisputeInput {
  reason: string;
  description: string;
}

export interface DisputeView {
  id: Uuid;
  transactionId: Uuid;
  openedByUserId: Uuid;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface PayoutStatus {
  onboardingStatus: PayoutOnboardingStatus;
  payoutsEnabled: boolean;
  hasAccount: boolean;
}
