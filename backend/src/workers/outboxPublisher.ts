import type { Outbox, PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { EventBus } from '../shared/events/bus.js';
import {
  eventPayloadSchemas,
  isEventType,
  type AppEvent,
} from '../shared/events/schemas.js';

export interface OutboxPublisherOptions {
  db: PrismaClient;
  bus: EventBus;
  log: Logger;
  batchSize?: number;
  maxAttempts?: number;
  pollIntervalMs?: number;
}

// Drains the outbox: pending rows -> event bus -> mark published.
// At-least-once delivery; consumers must tolerate duplicates.
export class OutboxPublisher {
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly pollIntervalMs: number;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly deps: OutboxPublisherOptions) {
    this.batchSize = deps.batchSize ?? 20;
    this.maxAttempts = deps.maxAttempts ?? 5;
    this.pollIntervalMs = deps.pollIntervalMs ?? 1000;
  }

  // One poll cycle; returns rows processed so tests and callers can loop deterministically.
  async tick(): Promise<number> {
    const rows = await this.deps.db.outbox.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: this.batchSize,
    });

    for (const row of rows) {
      try {
        await this.deps.bus.publish(toAppEvent(row));
        await this.deps.db.outbox.update({
          where: { id: row.id },
          data: { status: 'published', publishedAt: new Date() },
        });
      } catch (error) {
        const attempts = row.attempts + 1;
        await this.deps.db.outbox.update({
          where: { id: row.id },
          data: {
            attempts,
            lastError: error instanceof Error ? error.message : String(error),
            status: attempts >= this.maxAttempts ? 'failed' : 'pending',
          },
        });
        this.deps.log.error(
          { err: error, outboxId: row.id, eventType: row.eventType, attempts },
          'outbox publish failed',
        );
      }
    }

    return rows.length;
  }

  start(): void {
    if (this.timer) return;
    const loop = () => {
      this.timer = setTimeout(() => {
        void this.tick()
          .catch((error: unknown) => {
            this.deps.log.error({ err: error }, 'outbox tick failed');
          })
          .finally(loop);
      }, this.pollIntervalMs);
    };
    loop();
    this.deps.log.info(
      { pollIntervalMs: this.pollIntervalMs },
      'outbox publisher started',
    );
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}

function toAppEvent(row: Outbox): AppEvent {
  if (!isEventType(row.eventType)) {
    throw new Error(`Unknown event type in outbox: ${row.eventType}`);
  }
  const payload = eventPayloadSchemas[row.eventType].parse(row.payload);
  return {
    // The outbox row id doubles as the event id: stable across retries so
    // consumers can deduplicate.
    eventId: row.id,
    occurredAt: row.createdAt,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    payload,
  };
}
