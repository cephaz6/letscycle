import express from 'express';
import { createHealthRouter, type HealthDeps } from './routes/health.route.js';
import { createAuthRouter } from './routes/auth.route.js';
import { createUserRouter } from './routes/user.route.js';
import { createSystemRouter } from './routes/system.route.js';
import { createListingRouter } from './routes/listing.route.js';
import { createWishlistRouter } from './routes/wishlist.route.js';
import { createMatchRouter } from './routes/match.route.js';
import { createNotificationRouter } from './routes/notification.route.js';
import { createConversationRouter } from './routes/conversation.route.js';
import { createTransactionRouter } from './routes/transaction.route.js';
import { createTrustRouter } from './routes/trust.route.js';
import { errorHandler } from './middleware/error.js';
import type { AuthService, TokenVerifier } from '../services/auth/index.js';
import type { StorageService } from '../services/system/index.js';
import type { NotificationService } from '../services/notifications/index.js';
import type {
  PayoutService,
  TransactionService,
} from '../services/transactions/index.js';

export interface AppDeps extends HealthDeps {
  // Injected so unit tests choose their own dummies and DB wiring.
  authService?: AuthService;
  // Required to mount routes behind requireAuth (users, and modules to come).
  tokenVerifier?: TokenVerifier;
  storageService?: StorageService;
  notificationService?: NotificationService;
  transactionService?: TransactionService;
  payoutService?: PayoutService;
}

export function createApp(deps: AppDeps = {}): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/v1', createHealthRouter(deps));
  if (deps.authService) {
    app.use('/api/v1', createAuthRouter(deps.authService));
  }
  if (deps.tokenVerifier) {
    app.use('/api/v1', createUserRouter(deps.tokenVerifier));
    app.use('/api/v1', createWishlistRouter(deps.tokenVerifier));
    app.use('/api/v1', createMatchRouter(deps.tokenVerifier));
    app.use('/api/v1', createConversationRouter(deps.tokenVerifier));
    app.use('/api/v1', createTrustRouter(deps.tokenVerifier));
    if (deps.transactionService && deps.payoutService) {
      app.use(
        '/api/v1',
        createTransactionRouter({
          tokenVerifier: deps.tokenVerifier,
          transactionService: deps.transactionService,
          payoutService: deps.payoutService,
        }),
      );
    }
    if (deps.notificationService) {
      app.use(
        '/api/v1',
        createNotificationRouter({
          tokenVerifier: deps.tokenVerifier,
          notificationService: deps.notificationService,
        }),
      );
    }
  }
  app.use(
    '/api/v1',
    createSystemRouter({
      ...(deps.tokenVerifier && { tokenVerifier: deps.tokenVerifier }),
      ...(deps.storageService && { storageService: deps.storageService }),
    }),
  );
  if (deps.tokenVerifier && deps.storageService) {
    app.use(
      '/api/v1',
      createListingRouter({
        tokenVerifier: deps.tokenVerifier,
        storageService: deps.storageService,
      }),
    );
  }

  app.use(errorHandler);

  return app;
}
