// Extractable module — event-only integration. No other feature module imports
// notifications or calls it directly; they publish events its handlers react
// to. Exports are infrastructure wiring plus this module's own endpoints.
export {
  NotificationService,
  revokeAllPushSubscriptions,
} from './notifications.service.js';
export { registerNotificationHandlers } from './handlers.js';
export { createDummyPushSender } from './dispatchers/push.dummy.js';
export type { PushSender } from './dispatchers/push.types.js';
export type { NotificationType, Channel } from './notification.types.js';
