import { createApp } from './api/app.js';
import { getEnv } from './shared/config/env.js';
import { getLogger } from './shared/logging/logger.js';
import { disconnectDb, getDb } from './shared/db/client.js';
import { getEventBus } from './shared/events/bus.js';
import {
  AuthService,
  createDevCredentialStore,
  createDummyCognito,
  createGoogleVerifier,
} from './services/auth/index.js';
import {
  StorageService,
  createCloudinaryStorage,
  createDummyStorage,
} from './services/system/index.js';
import { registerMatchingHandlers } from './services/matching/index.js';
import {
  NotificationService,
  createDummyPushSender,
  registerNotificationHandlers,
} from './services/notifications/index.js';
import {
  PayoutService,
  TransactionService,
  createDummyPaymentGateway,
} from './services/transactions/index.js';
import { registerTrustHandlers } from './services/trust/index.js';
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

// Dummy credentials live in the database, so a registered account can always
// sign in again with its chosen password — nothing to lose on restart.
const { client: cognitoClient, verifier: tokenVerifier } = createDummyCognito(
  env.AUTH_DEV_TOKEN_SECRET ?? 'letscycle-local-dev-secret',
  hasDb ? { store: createDevCredentialStore(getDb()) } : {},
);

// "Continue with Google" is enabled once a Google OAuth client ID is set.
const googleVerifier = env.GOOGLE_CLIENT_ID
  ? createGoogleVerifier(env.GOOGLE_CLIENT_ID)
  : undefined;

// Uploads: Cloudinary when configured (hosts with no persistent disk would
// otherwise lose every photo on redeploy), else the dummy presigner pointing at
// the local dev media store. Real S3 replaces both behind the same seam with
// the AWS infrastructure.
const publicApiOrigin = env.PUBLIC_API_ORIGIN ?? `http://localhost:${env.PORT}`;
const cloudinary =
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
    ? {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        apiSecret: env.CLOUDINARY_API_SECRET,
      }
    : undefined;
// The local media store is only mounted when nothing else stores the bytes.
const devMediaDir = env.NODE_ENV === 'production' || cloudinary ? undefined : 'uploads';
const storageService = new StorageService(
  cloudinary
    ? createCloudinaryStorage(cloudinary)
    : createDummyStorage(devMediaDir ? publicApiOrigin : undefined),
  env.S3_BUCKET_UPLOADS ?? 'letscycle-uploads-dev',
);

// Real web push (VAPID keys from Secrets Manager) arrives with infrastructure.
const notificationService = new NotificationService(createDummyPushSender());

// Real Stripe Connect arrives with AWS infrastructure; the dummy gateway serves
// dev and CI (mints synthetic ids, moves no money).
const paymentGateway = createDummyPaymentGateway();
const transactionService = new TransactionService(paymentGateway);
const payoutService = new PayoutService(paymentGateway);

const app = createApp({
  ...(hasDb && {
    checkDbReady: async () => {
      await getDb().$queryRaw`SELECT 1`;
    },
    authService: new AuthService(cognitoClient, getDb(), googleVerifier),
    tokenVerifier,
    storageService,
    notificationService,
    transactionService,
    payoutService,
    enableRateLimit: true,
    ...(devMediaDir && { devMediaDir }),
  }),
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server listening');
});

let publisher: OutboxPublisher | undefined;
if (hasDb) {
  const bus = getEventBus();
  // Extractable modules subscribe here; the outbox publisher drains events to
  // the bus. In-process today, SNS/SQS after extraction.
  registerMatchingHandlers(bus);
  registerNotificationHandlers(bus, notificationService);
  registerTrustHandlers(bus);
  publisher = new OutboxPublisher({ db: getDb(), bus, log: logger });
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
