import { createApp } from './api/app.js';
import { getEnv } from './shared/config/env.js';
import { getLogger } from './shared/logging/logger.js';
import { disconnectDb, getDb } from './shared/db/client.js';
import { getEventBus } from './shared/events/bus.js';
import { OutboxPublisher } from './workers/outboxPublisher.js';

const env = getEnv();
const logger = getLogger();
const hasDb = Boolean(env.DATABASE_URL);

const app = createApp(
  hasDb
    ? {
        checkDbReady: async () => {
          await getDb().$queryRaw`SELECT 1`;
        },
      }
    : {},
);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server listening');
});

let publisher: OutboxPublisher | undefined;
if (hasDb) {
  publisher = new OutboxPublisher({ db: getDb(), bus: getEventBus(), log: logger });
  publisher.start();
} else {
  logger.warn('DATABASE_URL not set — outbox publisher disabled');
}

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  publisher?.stop();
  server.close(() => {
    void disconnectDb().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
