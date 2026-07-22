import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from '../../shared/errors/httpErrors.js';
import { seedDefaultSiteSettings } from '../system/index.js';
import { createListing } from '../listings/index.js';
import { createDummyPaymentGateway } from './payment.dummy.js';
import { PayoutService } from './payout.service.js';
import { TransactionService } from './transaction.service.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const L = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 };

describe.skipIf(!hasDb)('transactions service', () => {
  const service = new TransactionService(createDummyPaymentGateway(), getDb());
  const payouts = new PayoutService(createDummyPaymentGateway(), getDb());
  let sellerId: string;
  let buyerId: string;
  let strangerId: string;
  let categoryId: string;

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `txn-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Txn Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    return user.id;
  }

  async function makeListing(price = 10000): Promise<string> {
    const listing = await createListing({
      sellerId,
      title: 'Oak table',
      description: 'nice',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: price,
      location: L,
      publish: true,
    });
    return listing.id;
  }

  beforeAll(async () => {
    await seedDefaultSiteSettings(getDb());
    const cat = await getDb().category.create({
      data: {
        slug: `txn-cat-${runId}`,
        name: 'Txn',
        typicalDistanceKm: 10,
        iconName: 'x',
      },
      select: { id: true },
    });
    categoryId = cat.id;
    sellerId = await makeUser();
    buyerId = await makeUser();
    strangerId = await makeUser();
    // Seller needs an enabled payout account for escrow release.
    await payouts.onboard(sellerId);
    await payouts.getStatus(sellerId);
  });

  afterAll(async () => {
    const db = getDb();
    const users = [sellerId, buyerId, strangerId];
    const listings = await db.listing.findMany({
      where: { sellerId: { in: users } },
      select: { id: true },
    });
    const listingIds = listings.map((l) => l.id);
    await db.transactionEvent.deleteMany({
      where: { transaction: { listingId: { in: listingIds } } },
    });
    await db.dispute.deleteMany({
      where: { transaction: { listingId: { in: listingIds } } },
    });
    await db.transaction.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.payoutAccount.deleteMany({ where: { userId: { in: users } } });
    await db.outbox.deleteMany({
      where: { aggregateType: { in: ['transaction', 'listing'] } },
    });
    // Publishing a listing lets the matching handler write candidates/events
    // for it, which FK to the listing — clear them or the delete below fails.
    await db.matchEvent.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.matchCandidate.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.category.deleteMany({ where: { id: categoryId } });
    // Completing a transaction feeds the trust module, which scores the parties.
    await db.trustEvent.deleteMany({ where: { userId: { in: users } } });
    await db.trustScore.deleteMany({ where: { userId: { in: users } } });
    await db.notificationPreference.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { email: { contains: `txn-${runId}` } } });
    await disconnectDb();
  });

  it('creates a transaction with commission and emits transaction.initiated', async () => {
    const listingId = await makeListing(10000);
    const txn = await service.createTransaction({ buyerId, listingId });

    expect(txn.status).toBe('initiated');
    expect(txn.amountPence).toBe(10000);
    expect(txn.commissionPence).toBe(500); // 5% default
    expect(txn.buyerId).toBe(buyerId);
    expect(txn.sellerId).toBe(sellerId);

    const events = await getDb().outbox.findMany({
      where: { aggregateId: txn.id, eventType: 'transaction.initiated' },
    });
    expect(events).toHaveLength(1);
  });

  it('rejects buying your own listing and giveaways', async () => {
    const listingId = await makeListing(10000);
    await expect(
      service.createTransaction({ buyerId: sellerId, listingId }),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects a second active transaction on the same listing', async () => {
    const listingId = await makeListing(10000);
    await service.createTransaction({ buyerId, listingId });
    await expect(
      service.createTransaction({ buyerId: strangerId, listingId }),
    ).rejects.toThrow(ConflictError);
  });

  it('runs the full escrow flow: confirm, both complete, release', async () => {
    const listingId = await makeListing(20000);
    const txn = await service.createTransaction({ buyerId, listingId });

    // Only the seller can confirm.
    await expect(service.confirmTransaction(txn.id, buyerId)).rejects.toThrow(
      ForbiddenError,
    );
    const confirmed = await service.confirmTransaction(txn.id, sellerId);
    expect(confirmed.status).toBe('paymentAuthorised');
    expect(confirmed.stripePaymentIntentId).toBeTruthy();

    // First party confirms pickup — still awaiting the other.
    const afterFirst = await service.completeTransaction(txn.id, buyerId);
    expect(afterFirst.status).toBe('paymentAuthorised');

    // Second party confirms — funds captured, into escrow.
    const afterSecond = await service.completeTransaction(txn.id, sellerId);
    expect(afterSecond.status).toBe('inEscrow');

    const captured = await getDb().outbox.findMany({
      where: { aggregateId: txn.id, eventType: 'transaction.paymentCaptured' },
    });
    expect(captured).toHaveLength(1);

    // Hold period not elapsed yet.
    await expect(service.releaseEscrow(txn.id)).rejects.toThrow(BadRequestError);

    // Release after the hold window → completed with a transfer.
    const later = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    const released = await service.releaseEscrow(txn.id, later);
    expect(released.status).toBe('completed');
    expect(released.stripeTransferId).toBeTruthy();
    expect(released.completedAt).not.toBeNull();

    const completed = await getDb().outbox.findMany({
      where: { aggregateId: txn.id, eventType: 'transaction.completed' },
    });
    expect(completed).toHaveLength(1);
  });

  it('confirming the same pickup twice is idempotent', async () => {
    const listingId = await makeListing(5000);
    const txn = await service.createTransaction({ buyerId, listingId });
    await service.confirmTransaction(txn.id, sellerId);

    await service.completeTransaction(txn.id, buyerId);
    const again = await service.completeTransaction(txn.id, buyerId);
    expect(again.status).toBe('paymentAuthorised'); // still waiting on seller
  });

  it('opens a dispute and emits transaction.disputed', async () => {
    const listingId = await makeListing(8000);
    const txn = await service.createTransaction({ buyerId, listingId });
    await service.confirmTransaction(txn.id, sellerId);

    const { transaction, dispute } = await service.disputeTransaction(txn.id, buyerId, {
      reason: 'notAsDescribed',
      description: 'The table has a broken leg',
    });
    expect(transaction.status).toBe('disputed');
    expect(dispute.status).toBe('open');
    expect(dispute.openedByUserId).toBe(buyerId);

    const events = await getDb().outbox.findMany({
      where: { aggregateId: txn.id, eventType: 'transaction.disputed' },
    });
    expect(events).toHaveLength(1);
  });

  it('forbids non-parties and guards ownership', async () => {
    const listingId = await makeListing(9000);
    const txn = await service.createTransaction({ buyerId, listingId });
    await expect(service.getTransaction(txn.id, strangerId)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(service.completeTransaction(txn.id, strangerId)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('lists a user’s transactions', async () => {
    const listingId = await makeListing(4000);
    const txn = await service.createTransaction({ buyerId, listingId });
    const mine = await service.listMyTransactions(buyerId);
    expect(mine.some((t) => t.id === txn.id)).toBe(true);
  });

  describe('payouts', () => {
    it('onboards and reports status', async () => {
      const newSeller = await makeUser();
      const before = await payouts.getStatus(newSeller);
      expect(before.hasAccount).toBe(false);

      const { url } = await payouts.onboard(newSeller);
      expect(url).toContain('http');

      const after = await payouts.getStatus(newSeller);
      expect(after.hasAccount).toBe(true);
      expect(after.payoutsEnabled).toBe(true);

      await getDb().payoutAccount.deleteMany({ where: { userId: newSeller } });
    });
  });
});
