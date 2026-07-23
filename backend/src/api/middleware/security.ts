import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { getEnv } from '../../shared/config/env.js';

export interface SecurityOptions {
  // Off in tests (so the suite isn't throttled); the server turns it on.
  enableRateLimit: boolean;
}

// Applies transport-security hardening: secure headers, CORS restricted to the
// known frontend origin, and rate limiting (general + stricter on auth).
export function applySecurity(app: Express, options: SecurityOptions): void {
  const env = getEnv();

  // Secure headers (HSTS, X-Content-Type-Options, frameguard, etc.). This is a
  // JSON API, so the restrictive default CSP is fine.
  app.use(helmet());

  // CORS restricted to the configured frontend origin; reflect origin in dev
  // when none is set.
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN ? [env.FRONTEND_ORIGIN] : true,
      credentials: true,
    }),
  );

  if (options.enableRateLimit) {
    const common = { windowMs: 60_000, standardHeaders: true, legacyHeaders: false };
    // Stricter limit on auth to blunt credential stuffing / brute force.
    // Configurable so a local/E2E environment — which legitimately creates many
    // accounts in a short burst — can raise it without weakening the default
    // that ships to production (untouched unless AUTH_RATE_LIMIT_MAX is set).
    app.use(
      '/api/v1/auth',
      rateLimit({ ...common, limit: env.AUTH_RATE_LIMIT_MAX ?? 20 }),
    );
    app.use('/api/v1', rateLimit({ ...common, limit: 300 }));
  }
}
