import type { EventBus } from '../../shared/events/bus.js';
import { getLogger } from '../../shared/logging/logger.js';
import type { NotificationService } from './notifications.service.js';

// Worker-mode wiring: notifications reacts to events only. After extraction the
// same subscriptions run against SNS/SQS. Messaging/transaction/review events
// join as those modules land (steps 11–13).
export function registerNotificationHandlers(
  bus: EventBus,
  service: NotificationService,
): void {
  bus.subscribe('match.candidatesFound', async (event) => {
    const result = await service.handleMatchCandidates(event.payload.matchCandidateIds);
    getLogger().info(
      { listingId: event.payload.listingId, ...result },
      'notifications: match candidates notified',
    );
  });

  bus.subscribe('message.sent', async (event) => {
    const result = await service.handleMessageSent(event.payload.messageId);
    getLogger().info(
      { messageId: event.payload.messageId, ...result },
      'notifications: message recipient notified',
    );
  });

  // A buyer committing notifies the seller; capture/completion/disputes notify
  // both parties.
  bus.subscribe('transaction.initiated', async (event) => {
    await service.handleTransactionUpdate(event.payload.transactionId, 'seller');
  });
  // The seller chose this claimant, so it's the buyer who needs telling.
  bus.subscribe('transaction.handoverArranged', async (event) => {
    await service.handleTransactionUpdate(event.payload.transactionId, 'buyer');
  });
  bus.subscribe('transaction.cancelled', async (event) => {
    await service.handleTransactionUpdate(event.payload.transactionId, 'both');
  });
  bus.subscribe('transaction.paymentCaptured', async (event) => {
    await service.handleTransactionUpdate(event.payload.transactionId, 'both');
  });
  bus.subscribe('transaction.completed', async (event) => {
    await service.handleTransactionUpdate(event.payload.transactionId, 'both');
  });
  bus.subscribe('transaction.disputed', async (event) => {
    await service.handleTransactionUpdate(event.payload.transactionId, 'both');
  });

  bus.subscribe('review.submitted', async (event) => {
    await service.handleReviewReceived(
      event.payload.revieweeUserId,
      event.payload.reviewId,
    );
  });
}
