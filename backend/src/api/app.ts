import express from 'express';
import { createHealthRouter, type HealthDeps } from './routes/health.route.js';
import { createAuthRouter } from './routes/auth.route.js';
import { createUserRouter } from './routes/user.route.js';
import { createSystemRouter } from './routes/system.route.js';
import { errorHandler } from './middleware/error.js';
import type { AuthService, TokenVerifier } from '../services/auth/index.js';
import type { StorageService } from '../services/system/index.js';

export interface AppDeps extends HealthDeps {
  // Injected so unit tests choose their own dummies and DB wiring.
  authService?: AuthService;
  // Required to mount routes behind requireAuth (users, and modules to come).
  tokenVerifier?: TokenVerifier;
  storageService?: StorageService;
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
  }
  app.use(
    '/api/v1',
    createSystemRouter({
      ...(deps.tokenVerifier && { tokenVerifier: deps.tokenVerifier }),
      ...(deps.storageService && { storageService: deps.storageService }),
    }),
  );

  app.use(errorHandler);

  return app;
}
