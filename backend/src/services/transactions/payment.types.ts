import type { PayoutOnboardingStatus } from './transaction.types.js';

// Seam for Stripe Connect. The dummy serves dev and tests; the real
// implementation (Stripe SDK: PaymentIntents with manual capture, Connect
// Express accounts and Transfers) plugs in unchanged with the CDK
// infrastructure and the secret from Secrets Manager. Never used in production
// until then. All money is integer pence.
export interface PaymentGateway {
  createConnectAccount(input: { userId: string }): Promise<{ accountId: string }>;
  createOnboardingLink(accountId: string): Promise<{ url: string }>;
  getAccountStatus(
    accountId: string,
  ): Promise<{ onboardingStatus: PayoutOnboardingStatus; payoutsEnabled: boolean }>;

  // Authorise (but don't capture) the buyer's payment.
  authorizePayment(input: {
    transactionId: string;
    amountPence: number;
    currency: string;
    buyerId: string;
  }): Promise<{ paymentIntentId: string }>;

  capturePayment(paymentIntentId: string): Promise<void>;

  // Pay the seller their share (amount minus commission).
  transfer(input: {
    transactionId: string;
    amountPence: number;
    currency: string;
    destinationAccountId: string;
  }): Promise<{ transferId: string }>;
}
