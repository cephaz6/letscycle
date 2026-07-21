import { http } from '../http';

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

export interface Transaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountPence: number;
  commissionPence: number;
  currency: string;
  status: TransactionStatus;
  meetPointId: string | null;
  agreedPickupAt: string | null;
  completedAt: string | null;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dispute {
  id: string;
  transactionId: string;
  openedByUserId: string;
  reason: string;
  description: string;
  status: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface PayoutStatus {
  onboardingStatus: PayoutOnboardingStatus;
  payoutsEnabled: boolean;
  hasAccount: boolean;
}

export const transactionsApi = {
  /** Buyer commits to a priced sale listing (status: initiated). */
  create(listingId: string): Promise<Transaction> {
    return http.post<Transaction>('/transactions', { json: { listingId } });
  },

  getById(id: string): Promise<Transaction> {
    return http.get<Transaction>(`/transactions/${id}`);
  },

  listMine(): Promise<Transaction[]> {
    return http.get<Transaction[]>('/transactions/me');
  },

  /** Seller confirms the order → authorises the buyer's payment. */
  confirm(id: string): Promise<Transaction> {
    return http.post<Transaction>(`/transactions/${id}/confirm`);
  },

  /** Either party confirms pickup; the second confirmation completes it. */
  complete(id: string): Promise<Transaction> {
    return http.post<Transaction>(`/transactions/${id}/complete`);
  },

  /**
   * Free items: the seller picks who gets it. Creates a zero-amount handover
   * awaiting both pickup confirmations.
   */
  arrangeGiveaway(input: { listingId: string; buyerId: string }): Promise<Transaction> {
    return http.post<Transaction>('/transactions/giveaway', { json: input });
  },

  /** Either party calls it off before money is captured; releases the listing. */
  cancel(id: string): Promise<Transaction> {
    return http.post<Transaction>(`/transactions/${id}/cancel`);
  },

  dispute(id: string, input: { reason: string; description: string }): Promise<Dispute> {
    return http.post<Dispute>(`/transactions/${id}/dispute`, { json: input });
  },

  payouts: {
    status(): Promise<PayoutStatus> {
      return http.get<PayoutStatus>('/payouts/status');
    },
    /** Creates/links a Connect account; returns a Stripe onboarding URL. */
    onboard(): Promise<{ url: string }> {
      return http.post<{ url: string }>('/payouts/onboard');
    },
  },
};
