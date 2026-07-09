import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { PayoutOnboardingStatus } from './transaction.types.js';

type Db = PrismaClient | Tx;

export interface PayoutAccountRow {
  userId: string;
  stripeConnectAccountId: string;
  onboardingStatus: PayoutOnboardingStatus;
  payoutsEnabled: boolean;
}

export async function findByUser(
  db: Db,
  userId: string,
): Promise<PayoutAccountRow | null> {
  return db.payoutAccount.findUnique({
    where: { userId },
    select: {
      userId: true,
      stripeConnectAccountId: true,
      onboardingStatus: true,
      payoutsEnabled: true,
    },
  });
}

export async function upsert(
  db: Db,
  input: {
    userId: string;
    stripeConnectAccountId: string;
    onboardingStatus: PayoutOnboardingStatus;
    payoutsEnabled: boolean;
  },
): Promise<void> {
  await db.payoutAccount.upsert({
    where: { userId: input.userId },
    create: input,
    update: {
      onboardingStatus: input.onboardingStatus,
      payoutsEnabled: input.payoutsEnabled,
    },
  });
}
