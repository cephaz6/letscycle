import { z } from 'zod';

// Source of truth for module contracts (see backend-prd.md "Event schemas").
// Payloads start minimal — the owning module widens its own events as it is
// built, but only additively: extractable modules depend on these shapes.

export const eventPayloadSchemas = {
  'user.created': z.object({
    userId: z.uuid(),
  }),
  'user.verified': z.object({
    userId: z.uuid(),
    verificationType: z.enum(['idDocument', 'phone', 'email']),
  }),
  'listing.created': z.object({
    listingId: z.uuid(),
    sellerId: z.uuid(),
  }),
  'listing.updated': z.object({
    listingId: z.uuid(),
  }),
  'listing.reserved': z.object({
    listingId: z.uuid(),
    buyerId: z.uuid(),
  }),
  'listing.completed': z.object({
    listingId: z.uuid(),
  }),
  'listing.removed': z.object({
    listingId: z.uuid(),
  }),
  'wishlistItem.created': z.object({
    wishlistItemId: z.uuid(),
    userId: z.uuid(),
  }),
  'wishlistItem.updated': z.object({
    wishlistItemId: z.uuid(),
  }),
  'match.candidatesFound': z.object({
    listingId: z.uuid(),
    matchCandidateIds: z.array(z.uuid()),
  }),
  'match.interestExpressed': z.object({
    matchCandidateId: z.uuid(),
    userId: z.uuid(),
  }),
  'match.winnerSelected': z.object({
    matchCandidateId: z.uuid(),
    listingId: z.uuid(),
  }),
  'message.sent': z.object({
    messageId: z.uuid(),
    conversationId: z.uuid(),
    senderId: z.uuid(),
  }),
  'transaction.initiated': z.object({
    transactionId: z.uuid(),
  }),
  // A seller arranged a free handover with a chosen claimant.
  'transaction.handoverArranged': z.object({
    transactionId: z.uuid(),
  }),
  'transaction.cancelled': z.object({
    transactionId: z.uuid(),
  }),
  'transaction.paymentCaptured': z.object({
    transactionId: z.uuid(),
  }),
  'transaction.completed': z.object({
    transactionId: z.uuid(),
  }),
  'transaction.disputed': z.object({
    transactionId: z.uuid(),
    disputeId: z.uuid(),
  }),
  'review.submitted': z.object({
    reviewId: z.uuid(),
    revieweeUserId: z.uuid(),
  }),
  'flag.raised': z.object({
    flagId: z.uuid(),
    targetType: z.enum(['user', 'listing', 'message']),
    targetId: z.uuid(),
  }),
  'notification.dispatched': z.object({
    notificationId: z.uuid(),
    userId: z.uuid(),
    channels: z.array(z.string()),
  }),
} as const;

export type EventType = keyof typeof eventPayloadSchemas;

export type EventPayload<T extends EventType> = z.infer<(typeof eventPayloadSchemas)[T]>;

// Envelope carried by every event (in-process today, SNS/SQS after extraction).
export interface AppEvent<T extends EventType = EventType> {
  eventId: string;
  occurredAt: Date;
  eventType: T;
  aggregateType: string;
  aggregateId: string;
  payload: EventPayload<T>;
}

export function isEventType(value: string): value is EventType {
  return value in eventPayloadSchemas;
}
