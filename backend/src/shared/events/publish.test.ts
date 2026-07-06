import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../db/client.js';
import { withTransaction } from '../db/transaction.js';
import { publishEvent } from './publish.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const sellerId = '0be1b8d1-1275-4a51-a68c-04ba01c1e39e';
const listingId = '6e4a2ab6-4bd9-45ee-a319-91a621c8756c';

describe.skipIf(!hasDb)('publishEvent (outbox)', () => {
  beforeEach(async () => {
    await getDb().outbox.deleteMany({ where: { aggregateId: listingId } });
  });

  afterAll(async () => {
    await getDb().outbox.deleteMany({ where: { aggregateId: listingId } });
    await disconnectDb();
  });

  it('writes a pending outbox row inside the transaction', async () => {
    await withTransaction(async (tx) => {
      await publishEvent(tx, {
        eventType: 'listing.created',
        aggregateType: 'listing',
        aggregateId: listingId,
        payload: { listingId, sellerId },
      });
    });

    const rows = await getDb().outbox.findMany({
      where: { aggregateId: listingId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('pending');
    expect(rows[0]?.eventType).toBe('listing.created');
    expect(rows[0]?.payload).toEqual({ listingId, sellerId });
  });

  it('rolls back the outbox row when the transaction fails', async () => {
    await expect(
      withTransaction(async (tx) => {
        await publishEvent(tx, {
          eventType: 'listing.created',
          aggregateType: 'listing',
          aggregateId: listingId,
          payload: { listingId, sellerId },
        });
        throw new Error('business logic failed after publish');
      }),
    ).rejects.toThrow('business logic failed');

    const rows = await getDb().outbox.findMany({
      where: { aggregateId: listingId },
    });
    expect(rows).toHaveLength(0);
  });

  it('rejects payloads that violate the event schema', async () => {
    await expect(
      withTransaction(async (tx) => {
        await publishEvent(tx, {
          eventType: 'listing.created',
          aggregateType: 'listing',
          aggregateId: listingId,
          // @ts-expect-error — deliberately malformed payload
          payload: { listingId: 'not-a-uuid' },
        });
      }),
    ).rejects.toThrow();
  });
});
