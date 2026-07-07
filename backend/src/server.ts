import { createApp } from './api/app.js';
import { getEnv } from './shared/config/env.js';
import { getLogger } from './shared/logging/logger.js';
import { disconnectDb, getDb } from './shared/db/client.js';
import { getEventBus } from './shared/events/bus.js';
import { AuthService, createDummyCognito } from './services/auth/index.js';
import { StorageService, createDummyStorage } from './services/system/index.js';
import { OutboxPublisher } from './workers/outboxPublisher.js';

const env = getEnv();
const logger = getLogger();
const hasDb = Boolean(env.DATABASE_URL);

// Real Cognito arrives with AWS infrastructure; until then the dummy serves
// dev and CI. Production must never boot against it.
if (env.NODE_ENV === 'production' && !env.COGNITO_USER_POOL_ID) {
  throw new Error('COGNITO_USER_POOL_ID is required in production');
}
if (env.COGNITO_USER_POOL_ID) {
  throw new Error('Real Cognito client is not implemented yet (planned with CDK infra)');
}

const { client: cognitoClient, verifier: tokenVerifier } = createDummyCognito(
  env.AUTH_DEV_TOKEN_SECRET ?? 'letscycle-local-dev-secret',
);

// Real S3 arrives with AWS infrastructure; the dummy presigner serves dev and CI.
const storageService = new StorageService(
  createDummyStorage(),
  env.S3_BUCKET_UPLOADS ?? 'letscycle-uploads-dev',
);

const app = createApp({
  ...(hasDb && {
    checkDbReady: async () => {
      await getDb().$queryRaw`SELECT 1`;
    },
    authService: new AuthService(cognitoClient),
    tokenVerifier,
    storageService,
  }),
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server listening');
});

let publisher: OutboxPublisher | undefined;
if (hasDb) {
  publisher = new OutboxPublisher({ db: getDb(), bus: getEventBus(), log: logger });
  publisher.start();
} else {
  logger.warn('DATABASE_URL not set — outbox publisher and auth disabled');
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
