import type { PrismaClient } from '@prisma/client';
import * as repo from '../notification.repository.js';
import type { PushMessage, PushSender } from './push.types.js';

// Sends a push to every active subscription for the user. A subscription the
// sender reports as gone (false) is revoked so we stop trying it.
export async function dispatchWebPush(
  db: PrismaClient,
  sender: PushSender,
  userId: string,
  message: PushMessage,
): Promise<boolean> {
  const subscriptions = await repo.activeSubscriptions(db, userId);
  if (subscriptions.length === 0) return false;

  let anyDelivered = false;
  for (const subscription of subscriptions) {
    const ok = await sender.send(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      message,
    );
    if (ok) {
      anyDelivered = true;
    } else {
      await repo.revokeSubscription(db, subscription.endpoint);
    }
  }
  return anyDelivered;
}
