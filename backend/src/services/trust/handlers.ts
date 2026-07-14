import type { EventBus } from '../../shared/events/bus.js';
import { getLogger } from '../../shared/logging/logger.js';
import { handleTransactionCompleted, handleUserVerified } from './trust.service.js';

// Trust reacts to verified events to keep scores current.
export function registerTrustHandlers(bus: EventBus): void {
  bus.subscribe('transaction.completed', async (event) => {
    await handleTransactionCompleted(event.payload.transactionId);
    getLogger().info(
      { transactionId: event.payload.transactionId },
      'trust: recorded successful transaction',
    );
  });

  bus.subscribe('user.verified', async (event) => {
    await handleUserVerified(event.payload.userId, event.payload.verificationType);
  });
}
