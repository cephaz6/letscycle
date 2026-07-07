import type { EventBus } from '../../shared/events/bus.js';
import { getLogger } from '../../shared/logging/logger.js';
import { computeCandidatesForListing } from './matching.service.js';

// Worker-mode wiring: matching reacts to events only. After extraction this
// same subscription runs against SNS/SQS instead of the in-process bus, with
// no change to the handler body.
export function registerMatchingHandlers(bus: EventBus): void {
  bus.subscribe('listing.created', async (event) => {
    const result = await computeCandidatesForListing(event.payload.listingId);
    getLogger().info(
      { listingId: event.payload.listingId, ...result },
      'matching: candidates computed',
    );
  });
}
