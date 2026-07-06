import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { disconnectDb, getDb } from '../shared/db/client.js';
import { createLogger } from '../shared/logging/logger.js';
import type { AppEvent } from '../shared/events/schemas.js';
import { OutboxPublisher } from './outboxPublisher.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const aggregateId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const listingId = aggregateId;
const sellerId = '0be1b8d1-1275-4a51-a68c-04ba01c1e39e';

const silentLog = createLogger({ level: 'silent' });

// Test files share one database, so assertions scope to this file's rows
// (matched by aggregateId) — tick() drains whatever is pending globally.
function makeBus(publish = vi.fn().mockResolvedValue(undefined)) {
  return { bus: { subscribe: vi.fn(), publish }, publish };
}

function callsForRow(publish: ReturnType<typeof vi.fn>, rowId: string): AppEvent[] {
  return publish.mock.calls
    .map((call) => call[0] as AppEvent)
    .filter((event) => event.eventId === rowId);
}

async function seedPendingRow() {
  return getDb().outbox.create({
    data: {
      eventType: 'listing.created',
      aggregateType: 'listing',
      aggregateId,
      payload: { listingId, sellerId },
    },
  });
}

describe.skipIf(!hasDb)('OutboxPublisher', () => {
  beforeEach(async () => {
    await getDb().outbox.deleteMany({ where: { aggregateId } });
  });

  afterAll(async () => {
    await getDb().outbox.deleteMany({ where: { aggregateId } });
    await disconnectDb();
  });

  it('publishes pending rows to the bus and marks them published', async () => {
    const row = await seedPendingRow();
    const { bus, publish } = makeBus();
    const publisher = new OutboxPublisher({ db: getDb(), bus, log: silentLog });

    const processed = await publisher.tick();

    expect(processed).toBeGreaterThanOrEqual(1);
    const events = callsForRow(publish, row.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('listing.created');
    expect(events[0]?.payload).toEqual({ listingId, sellerId });

    const updated = await getDb().outbox.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe('published');
    expect(updated?.publishedAt).not.toBeNull();
  });

  it('does not re-deliver already published rows', async () => {
    const row = await seedPendingRow();
    const { bus, publish } = makeBus();
    const publisher = new OutboxPublisher({ db: getDb(), bus, log: silentLog });

    await publisher.tick();
    await publisher.tick();

    expect(callsForRow(publish, row.id)).toHaveLength(1);
  });

  it('records failures and retries until maxAttempts, then marks failed', async () => {
    const row = await seedPendingRow();
    const { bus } = makeBus(vi.fn().mockRejectedValue(new Error('bus down')));
    const publisher = new OutboxPublisher({
      db: getDb(),
      bus,
      log: silentLog,
      maxAttempts: 2,
    });

    await publisher.tick();
    let current = await getDb().outbox.findUnique({ where: { id: row.id } });
    expect(current?.status).toBe('pending');
    expect(current?.attempts).toBe(1);
    expect(current?.lastError).toBe('bus down');

    await publisher.tick();
    current = await getDb().outbox.findUnique({ where: { id: row.id } });
    expect(current?.status).toBe('failed');
    expect(current?.attempts).toBe(2);
  });

  it('marks rows with unknown event types as failed without crashing', async () => {
    const row = await getDb().outbox.create({
      data: {
        eventType: 'not.aRealEvent',
        aggregateType: 'listing',
        aggregateId,
        payload: {},
      },
    });
    const { bus, publish } = makeBus();
    const publisher = new OutboxPublisher({
      db: getDb(),
      bus,
      log: silentLog,
      maxAttempts: 1,
    });

    await publisher.tick();

    expect(callsForRow(publish, row.id)).toHaveLength(0);
    const current = await getDb().outbox.findUnique({ where: { id: row.id } });
    expect(current?.status).toBe('failed');
    expect(current?.lastError).toContain('Unknown event type');
  });
});
