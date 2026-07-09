import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { BadRequestError, ForbiddenError } from '../../shared/errors/httpErrors.js';
import { createListing } from '../listings/index.js';
import {
  getUserTrustScore,
  handleTransactionCompleted,
  raiseFlag,
  submitReview,
} from './trust.service.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const L = { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 };

describe.skipIf(!hasDb)('trust service', () => {
  let categoryId: string;
  const userIds: string[] = [];

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `trust-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Trust Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    userIds.push(user.id);
    return user.id;
  }

  // A fresh buyer/seller with a completed transaction to review.
  async function completedDeal(status = 'completed'): Promise<{
    txnId: string;
    buyerId: string;
    sellerId: string;
  }> {
    const sellerId = await makeUser();
    const buyerId = await makeUser();
    const listing = await createListing({
      sellerId,
      title: 'Oak table',
      description: 'nice',
      categoryId,
      condition: 'good',
      listingType: 'sell',
      pricePence: 10000,
      location: L,
      publish: true,
    });
    const txn = await getDb().transaction.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId,
        amountPence: 10000,
        commissionPence: 500,
        status: status as 'completed' | 'initiated',
        ...(status === 'completed' && { completedAt: new Date() }),
      },
      select: { id: true },
    });
    return { txnId: txn.id, buyerId, sellerId };
  }

  beforeAll(async () => {
    const cat = await getDb().category.create({
      data: {
        slug: `trust-cat-${runId}`,
        name: 'Trust',
        typicalDistanceKm: 10,
        iconName: 'x',
      },
      select: { id: true },
    });
    categoryId = cat.id;
  });

  afterAll(async () => {
    const db = getDb();
    const listings = await db.listing.findMany({
      where: { sellerId: { in: userIds } },
      select: { id: true },
    });
    const listingIds = listings.map((l) => l.id);
    await db.review.deleteMany({ where: { revieweeUserId: { in: userIds } } });
    await db.flag.deleteMany({ where: { reporterUserId: { in: userIds } } });
    await db.trustEvent.deleteMany({ where: { userId: { in: userIds } } });
    await db.trustScore.deleteMany({ where: { userId: { in: userIds } } });
    await db.transaction.deleteMany({ where: { listingId: { in: listingIds } } });
    await db.outbox.deleteMany({
      where: { aggregateType: { in: ['review', 'flag', 'listing'] } },
    });
    await db.listing.deleteMany({ where: { id: { in: listingIds } } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.user.deleteMany({ where: { email: { contains: `trust-${runId}` } } });
    await disconnectDb();
  });

  describe('submitReview', () => {
    it('records a review, raises the reviewee score, and emits review.submitted', async () => {
      const { txnId, buyerId, sellerId } = await completedDeal();

      const review = await submitReview(buyerId, {
        transactionId: txnId,
        rating: 5,
        comment: 'Great seller',
      });
      expect(review.revieweeUserId).toBe(sellerId);
      expect(review.rating).toBe(5);

      const score = await getUserTrustScore(sellerId);
      expect(score?.currentScore).toBeCloseTo(0.54, 6); // 0.5 base + 0.04 positive
      expect(score?.scoreComponents.positiveReview).toBeCloseTo(0.04, 6);

      const events = await getDb().outbox.findMany({
        where: { aggregateId: review.id, eventType: 'review.submitted' },
      });
      expect(events).toHaveLength(1);
    });

    it('a low rating lowers the reviewee score', async () => {
      const { txnId, buyerId, sellerId } = await completedDeal();
      await submitReview(buyerId, { transactionId: txnId, rating: 1 });
      const score = await getUserTrustScore(sellerId);
      expect(score?.currentScore).toBeCloseTo(0.42, 6); // 0.5 - 0.08
    });

    it('forbids non-parties and blocks reviewing non-completed transactions', async () => {
      const { txnId, buyerId } = await completedDeal();
      const stranger = await makeUser();
      await expect(
        submitReview(stranger, { transactionId: txnId, rating: 5 }),
      ).rejects.toThrow(ForbiddenError);

      const pending = await completedDeal('initiated');
      await expect(
        submitReview(pending.buyerId, { transactionId: pending.txnId, rating: 5 }),
      ).rejects.toThrow(BadRequestError);

      // Guard so `buyerId` is used and duplicate review path is covered.
      await submitReview(buyerId, { transactionId: txnId, rating: 4 });
      await expect(
        submitReview(buyerId, { transactionId: txnId, rating: 4 }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('handleTransactionCompleted', () => {
    it('gives both parties a successfulTransaction and is idempotent', async () => {
      const { txnId, buyerId, sellerId } = await completedDeal();

      await handleTransactionCompleted(txnId);
      const buyerScore = await getUserTrustScore(buyerId);
      const sellerScore = await getUserTrustScore(sellerId);
      expect(buyerScore?.currentScore).toBeCloseTo(0.55, 6); // 0.5 + 0.05
      expect(sellerScore?.currentScore).toBeCloseTo(0.55, 6);

      // Re-delivery must not double-count.
      await handleTransactionCompleted(txnId);
      expect((await getUserTrustScore(buyerId))?.currentScore).toBeCloseTo(0.55, 6);
      expect(
        await getDb().trustEvent.count({
          where: { userId: buyerId, eventType: 'successfulTransaction' },
        }),
      ).toBe(1);
    });
  });

  describe('raiseFlag', () => {
    it('creates a flag, emits flag.raised, and is idempotent per open flag', async () => {
      const reporter = await makeUser();
      const targetId = randomUUID();

      const flag = await raiseFlag(reporter, {
        targetType: 'listing',
        targetId,
        reason: 'prohibited',
        description: 'counterfeit goods',
      });
      expect(flag.status).toBe('open');

      const events = await getDb().outbox.findMany({
        where: { aggregateId: flag.id, eventType: 'flag.raised' },
      });
      expect(events).toHaveLength(1);

      const again = await raiseFlag(reporter, {
        targetType: 'listing',
        targetId,
        reason: 'prohibited',
      });
      expect(again.id).toBe(flag.id);
    });
  });
});
