import { getLogger } from '../logging/logger.js';
import type { AppEvent, EventType } from './schemas.js';

export type EventHandler<T extends EventType> = (
  event: AppEvent<T>,
) => void | Promise<void>;

// The only integration surface between extractable modules (matching,
// notifications) and the rest of the app. Swap the implementation for
// SNS + SQS at extraction time; subscribers don't change.
export interface EventBus {
  subscribe<T extends EventType>(eventType: T, handler: EventHandler<T>): void;
  publish(event: AppEvent): Promise<void>;
}

type AnyHandler = EventHandler<EventType>;

export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<EventType, Set<AnyHandler>>();

  constructor(
    private readonly onHandlerError: (error: unknown, event: AppEvent) => void,
  ) {}

  subscribe<T extends EventType>(eventType: T, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? new Set();
    existing.add(handler as AnyHandler);
    this.handlers.set(eventType, existing);
  }

  // A failing subscriber must not break the publisher or other subscribers —
  // same isolation SQS would give us.
  async publish(event: AppEvent): Promise<void> {
    const subscribers = this.handlers.get(event.eventType) ?? new Set();
    for (const handler of subscribers) {
      try {
        await handler(event);
      } catch (error) {
        this.onHandlerError(error, event);
      }
    }
  }
}

let cached: InProcessEventBus | undefined;

export function getEventBus(): EventBus {
  if (!cached) {
    cached = new InProcessEventBus((error, event) => {
      getLogger().error(
        { err: error, eventType: event.eventType, eventId: event.eventId },
        'event handler failed',
      );
    });
  }
  return cached;
}
