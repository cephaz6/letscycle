import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import { getListing, setListingSaleStatus } from '../listings/index.js';
import { getSettingValue } from '../system/index.js';
import * as repo from './transaction.repository.js';
import * as payoutRepo from './payout.repository.js';
import * as disputeRepo from './dispute.repository.js';
import type { PaymentGateway } from './payment.types.js';
import type {
  CreateTransactionInput,
  DisputeInput,
  DisputeView,
  TransactionView,
} from './transaction.types.js';

const DEFAULT_COMMISSION_BPS = 500;
const DEFAULT_HOLD_HOURS = 48;

// Non-guarded read for other modules that react to transaction events (trust,
// notifications) and need the participants.
export async function getTransactionParties(
  transactionId: string,
  db: PrismaClient = getDb(),
): Promise<{
  buyerId: string;
  sellerId: string;
  status: TransactionView['status'];
} | null> {
  const transaction = await repo.findById(db, transactionId);
  if (!transaction) return null;
  return {
    buyerId: transaction.buyerId,
    sellerId: transaction.sellerId,
    status: transaction.status,
  };
}

// Non-guarded list for privacy export (the caller is always the subject).
export async function listUserTransactions(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<TransactionView[]> {
  return repo.listByUser(db, userId);
}

// Disputes and completion are only reachable from these active states.
const DISPUTABLE: TransactionView['status'][] = [
  'paymentAuthorised',
  'paymentCaptured',
  'inEscrow',
];

export class TransactionService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly db: PrismaClient = getDb(),
  ) {}

  async createTransaction(input: CreateTransactionInput): Promise<TransactionView> {
    const listing = await getListing(input.listingId, this.db);
    if (listing.listingType !== 'sell' || listing.pricePence === null) {
      throw new BadRequestError('Only priced sale listings can be transacted');
    }
    if (listing.sellerId === input.buyerId) {
      throw new BadRequestError('You cannot buy your own listing');
    }
    if (listing.status !== 'active' && listing.status !== 'reserved') {
      throw new BadRequestError(`Listing is not available (status: ${listing.status})`);
    }
    if (await repo.findActiveForListing(this.db, input.listingId)) {
      throw new ConflictError('This listing already has an active transaction');
    }

    const amountPence = listing.pricePence;
    const commissionPence = await this.commissionFor(amountPence);

    const created = await withTransaction(async (tx) => {
      const transaction = await repo.insert(tx, {
        listingId: input.listingId,
        buyerId: input.buyerId,
        sellerId: listing.sellerId,
        amountPence,
        commissionPence,
        agreedPickupAt: input.agreedPickupAt ?? null,
      });
      await repo.insertEvent(tx, {
        transactionId: transaction.id,
        eventType: 'initiated',
        actorId: input.buyerId,
      });
      await setListingSaleStatus(tx, input.listingId, 'reserved');
      await publishEvent(tx, {
        eventType: 'transaction.initiated',
        aggregateType: 'transaction',
        aggregateId: transaction.id,
        payload: { transactionId: transaction.id },
      });
      return transaction;
    }, this.db);

    return created;
  }

  /**
   * Free items: the seller picks one of the people who showed interest and
   * arranges the handover. There's no payment, so choosing a claimant is the
   * agreement itself — it starts awaiting both pickup confirmations.
   */
  async arrangeGiveaway(input: {
    listingId: string;
    sellerId: string;
    buyerId: string;
  }): Promise<TransactionView> {
    const listing = await getListing(input.listingId, this.db);
    if (listing.listingType !== 'giveaway') {
      throw new BadRequestError('Only giveaway listings can be handed over this way');
    }
    if (listing.sellerId !== input.sellerId) {
      throw new ForbiddenError('Only the seller can arrange a handover');
    }
    if (input.buyerId === input.sellerId) {
      throw new BadRequestError('You cannot claim your own listing');
    }
    if (listing.status !== 'active' && listing.status !== 'reserved') {
      throw new BadRequestError(`Listing is not available (status: ${listing.status})`);
    }
    if (await repo.findActiveForListing(this.db, input.listingId)) {
      throw new ConflictError('This listing already has an active handover');
    }

    const created = await withTransaction(async (tx) => {
      const transaction = await repo.insert(tx, {
        listingId: input.listingId,
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        amountPence: 0,
        commissionPence: 0,
        agreedPickupAt: null,
      });
      await repo.insertEvent(tx, {
        transactionId: transaction.id,
        eventType: 'initiated',
        actorId: input.sellerId,
      });
      await repo.updateTransaction(tx, transaction.id, { status: 'paymentAuthorised' });
      await repo.insertEvent(tx, {
        transactionId: transaction.id,
        eventType: 'handoverArranged',
        actorId: input.sellerId,
      });
      await setListingSaleStatus(tx, input.listingId, 'reserved');
      await publishEvent(tx, {
        eventType: 'transaction.handoverArranged',
        aggregateType: 'transaction',
        aggregateId: transaction.id,
        payload: { transactionId: transaction.id },
      });
      return transaction;
    }, this.db);

    return this.requireTransaction(created.id);
  }

  /**
   * Either party calls off a sale or handover before any money is captured.
   * Releases the listing so it can be claimed again.
   */
  async cancelTransaction(id: string, userId: string): Promise<TransactionView> {
    const transaction = await this.requireParticipant(id, userId);
    if (
      transaction.status !== 'initiated' &&
      transaction.status !== 'paymentAuthorised'
    ) {
      throw new BadRequestError(`Cannot cancel a ${transaction.status} transaction`);
    }

    // Release the authorisation so the buyer's funds stop being held.
    if (transaction.stripePaymentIntentId) {
      await this.gateway.voidPayment(transaction.stripePaymentIntentId);
    }

    await withTransaction(async (tx) => {
      await repo.updateTransaction(tx, id, { status: 'cancelled' });
      await repo.insertEvent(tx, {
        transactionId: id,
        eventType: 'cancelled',
        actorId: userId,
      });
      await setListingSaleStatus(tx, transaction.listingId, 'active');
      await publishEvent(tx, {
        eventType: 'transaction.cancelled',
        aggregateType: 'transaction',
        aggregateId: id,
        payload: { transactionId: id },
      });
    }, this.db);

    return this.requireTransaction(id);
  }

  // Seller approves the buyer: authorise (not capture) the payment.
  async confirmTransaction(id: string, sellerId: string): Promise<TransactionView> {
    const transaction = await this.requireTransaction(id);
    if (transaction.sellerId !== sellerId) {
      throw new ForbiddenError('Only the seller can confirm');
    }
    if (transaction.status !== 'initiated') {
      throw new BadRequestError(`Cannot confirm a ${transaction.status} transaction`);
    }

    const { paymentIntentId } = await this.gateway.authorizePayment({
      transactionId: id,
      amountPence: transaction.amountPence,
      currency: transaction.currency,
      buyerId: transaction.buyerId,
    });

    await withTransaction(async (tx) => {
      await repo.updateTransaction(tx, id, {
        status: 'paymentAuthorised',
        stripePaymentIntentId: paymentIntentId,
      });
      await repo.insertEvent(tx, {
        transactionId: id,
        eventType: 'paymentAuthorised',
        actorId: sellerId,
      });
    }, this.db);

    return this.requireTransaction(id);
  }

  // Both parties confirm pickup; when the second confirms, funds are captured.
  async completeTransaction(id: string, userId: string): Promise<TransactionView> {
    const transaction = await this.requireParticipant(id, userId);
    if (transaction.status !== 'paymentAuthorised') {
      throw new BadRequestError(
        `Transaction is not awaiting pickup confirmation (status: ${transaction.status})`,
      );
    }

    const actors = await repo.distinctEventActors(this.db, id, 'pickupConfirmed');
    if (actors.includes(userId)) {
      return transaction; // already confirmed; waiting on the other party
    }
    const other =
      userId === transaction.buyerId ? transaction.sellerId : transaction.buyerId;
    const completesPair = actors.includes(other);

    if (completesPair && transaction.amountPence === 0) {
      // Free handover: nothing to capture or hold, so the second confirmation
      // completes it outright and the listing is marked gone.
      const now = new Date();
      await withTransaction(async (tx) => {
        await repo.insertEvent(tx, {
          transactionId: id,
          eventType: 'pickupConfirmed',
          actorId: userId,
        });
        await repo.updateTransaction(tx, id, { status: 'completed', completedAt: now });
        await repo.insertEvent(tx, {
          transactionId: id,
          eventType: 'completed',
          actorId: null,
        });
        await setListingSaleStatus(tx, transaction.listingId, 'completed');
        await publishEvent(tx, {
          eventType: 'transaction.completed',
          aggregateType: 'transaction',
          aggregateId: id,
          payload: { transactionId: id },
        });
      }, this.db);
    } else if (completesPair) {
      // Second confirmation → capture the authorised payment and move to escrow.
      if (transaction.stripePaymentIntentId) {
        await this.gateway.capturePayment(transaction.stripePaymentIntentId);
      }
      await withTransaction(async (tx) => {
        await repo.insertEvent(tx, {
          transactionId: id,
          eventType: 'pickupConfirmed',
          actorId: userId,
        });
        await repo.updateTransaction(tx, id, { status: 'inEscrow' });
        await repo.insertEvent(tx, {
          transactionId: id,
          eventType: 'paymentCaptured',
          actorId: null,
        });
        await publishEvent(tx, {
          eventType: 'transaction.paymentCaptured',
          aggregateType: 'transaction',
          aggregateId: id,
          payload: { transactionId: id },
        });
      }, this.db);
    } else {
      await withTransaction(async (tx) => {
        await repo.insertEvent(tx, {
          transactionId: id,
          eventType: 'pickupConfirmed',
          actorId: userId,
        });
      }, this.db);
    }

    return this.requireTransaction(id);
  }

  // System/scheduled: after the hold period, pay out the seller and complete.
  async releaseEscrow(id: string, now: Date = new Date()): Promise<TransactionView> {
    const transaction = await this.requireTransaction(id);
    if (transaction.status !== 'inEscrow') {
      throw new BadRequestError(
        `Transaction is not in escrow (status: ${transaction.status})`,
      );
    }

    const holdHours = await this.holdHours();
    const captured = await repo.capturedAt(this.db, id);
    if (captured && now.getTime() < captured.getTime() + holdHours * 3_600_000) {
      throw new BadRequestError('Escrow hold period has not elapsed');
    }

    const payout = await payoutRepo.findByUser(this.db, transaction.sellerId);
    if (!payout || !payout.payoutsEnabled) {
      throw new BadRequestError('Seller payout account is not ready');
    }

    const { transferId } = await this.gateway.transfer({
      transactionId: id,
      amountPence: transaction.amountPence - transaction.commissionPence,
      currency: transaction.currency,
      destinationAccountId: payout.stripeConnectAccountId,
    });

    await withTransaction(async (tx) => {
      await repo.updateTransaction(tx, id, {
        status: 'completed',
        stripeTransferId: transferId,
        completedAt: now,
      });
      await repo.insertEvent(tx, {
        transactionId: id,
        eventType: 'completed',
        actorId: null,
      });
      await setListingSaleStatus(tx, transaction.listingId, 'completed');
      await publishEvent(tx, {
        eventType: 'transaction.completed',
        aggregateType: 'transaction',
        aggregateId: id,
        payload: { transactionId: id },
      });
    }, this.db);

    return this.requireTransaction(id);
  }

  async disputeTransaction(
    id: string,
    userId: string,
    input: DisputeInput,
  ): Promise<{ transaction: TransactionView; dispute: DisputeView }> {
    const transaction = await this.requireParticipant(id, userId);
    if (!DISPUTABLE.includes(transaction.status)) {
      throw new BadRequestError(`Cannot dispute a ${transaction.status} transaction`);
    }

    const dispute = await withTransaction(async (tx) => {
      const created = await disputeRepo.insert(tx, {
        transactionId: id,
        openedByUserId: userId,
        reason: input.reason,
        description: input.description,
      });
      await repo.updateTransaction(tx, id, { status: 'disputed' });
      await repo.insertEvent(tx, {
        transactionId: id,
        eventType: 'disputed',
        actorId: userId,
        notes: input.reason,
      });
      await publishEvent(tx, {
        eventType: 'transaction.disputed',
        aggregateType: 'transaction',
        aggregateId: id,
        payload: { transactionId: id, disputeId: created.id },
      });
      return created;
    }, this.db);

    return { transaction: await this.requireTransaction(id), dispute };
  }

  async getTransaction(id: string, userId: string): Promise<TransactionView> {
    return this.requireParticipant(id, userId);
  }

  async listMyTransactions(userId: string): Promise<TransactionView[]> {
    return repo.listByUser(this.db, userId);
  }

  private async requireTransaction(id: string): Promise<TransactionView> {
    const transaction = await repo.findById(this.db, id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }
    return transaction;
  }

  private async requireParticipant(id: string, userId: string): Promise<TransactionView> {
    const transaction = await this.requireTransaction(id);
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenError('Not a party to this transaction');
    }
    return transaction;
  }

  private async commissionFor(amountPence: number): Promise<number> {
    const bps = await this.settingNumber('public.commissionBps', DEFAULT_COMMISSION_BPS);
    return Math.round((amountPence * bps) / 10_000);
  }

  private async holdHours(): Promise<number> {
    return this.settingNumber('transaction.holdPeriodHours', DEFAULT_HOLD_HOURS);
  }

  private async settingNumber(key: string, fallback: number): Promise<number> {
    try {
      const value = await getSettingValue(key, this.db);
      return typeof value === 'number' ? value : fallback;
    } catch {
      return fallback;
    }
  }
}
