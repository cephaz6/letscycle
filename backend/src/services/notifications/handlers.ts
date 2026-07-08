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
}
