import { randomUUID } from 'node:crypto';
import type { PaymentGateway } from './payment.types.js';

// In-memory Stripe stand-in for dev and tests: mints synthetic ids and reports
// onboarded/enabled accounts so the escrow flow runs end-to-end. No money
// moves. Real Stripe replaces this behind the PaymentGateway interface.
export function createDummyPaymentGateway(): PaymentGateway {
  return {
    createConnectAccount() {
      return Promise.resolve({ accountId: `acct_dummy_${randomUUID()}` });
    },
    createOnboardingLink(accountId) {
      return Promise.resolve({
        url: `https://connect.stripe.dummy.local/onboarding/${accountId}`,
      });
    },
    getAccountStatus() {
      return Promise.resolve({ onboardingStatus: 'complete', payoutsEnabled: true });
    },
    authorizePayment() {
      return Promise.resolve({ paymentIntentId: `pi_dummy_${randomUUID()}` });
    },
    capturePayment() {
      return Promise.resolve();
    },
    voidPayment() {
      return Promise.resolve();
    },
    transfer() {
      return Promise.resolve({ transferId: `tr_dummy_${randomUUID()}` });
    },
  };
}
