import type { Tx } from '../db/transaction.js';
import { eventPayloadSchemas, type EventPayload, type EventType } from './schemas.js';

export interface PublishInput<T extends EventType> {
  eventType: T;
  aggregateType: string;
  aggregateId: string;
  payload: EventPayload<T>;
}

// Outbox pattern: the event is written in the SAME transaction as the state
// change, so "DB committed" guarantees "event will be delivered". Delivery to
// the bus happens only in the outbox publisher worker — emitting here as well
// would race the commit and double-deliver.
export async function publishEvent<T extends EventType>(
  tx: Tx,
  input: PublishInput<T>,
): Promise<void> {
  eventPayloadSchemas[input.eventType].parse(input.payload);

  await tx.outbox.create({
    data: {
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
    },
  });
}
