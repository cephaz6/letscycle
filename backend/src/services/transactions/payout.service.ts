import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import * as payoutRepo from './payout.repository.js';
import type { PaymentGateway } from './payment.types.js';
import type { PayoutStatus } from './transaction.types.js';

// Stripe Connect onboarding for sellers, so they can receive payouts.
export class PayoutService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly db: PrismaClient = getDb(),
  ) {}

  // Starts (or resumes) onboarding and returns a hosted onboarding link.
  async onboard(userId: string): Promise<{ url: string }> {
    let account = await payoutRepo.findByUser(this.db, userId);
    if (!account) {
      const { accountId } = await this.gateway.createConnectAccount({ userId });
      await payoutRepo.upsert(this.db, {
        userId,
        stripeConnectAccountId: accountId,
        onboardingStatus: 'pending',
        payoutsEnabled: false,
      });
      account = await payoutRepo.findByUser(this.db, userId);
    }
    const { url } = await this.gateway.createOnboardingLink(
      account!.stripeConnectAccountId,
    );
    return { url };
  }

  // Refreshes onboarding state from Stripe and returns it.
  async getStatus(userId: string): Promise<PayoutStatus> {
    const account = await payoutRepo.findByUser(this.db, userId);
    if (!account) {
      return { onboardingStatus: 'pending', payoutsEnabled: false, hasAccount: false };
    }
    const status = await this.gateway.getAccountStatus(account.stripeConnectAccountId);
    await payoutRepo.upsert(this.db, {
      userId,
      stripeConnectAccountId: account.stripeConnectAccountId,
      onboardingStatus: status.onboardingStatus,
      payoutsEnabled: status.payoutsEnabled,
    });
    return { ...status, hasAccount: true };
  }
}
