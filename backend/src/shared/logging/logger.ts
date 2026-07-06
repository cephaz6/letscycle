import { pino, type DestinationStream, type Logger } from 'pino';
import { getEnv } from '../config/env.js';

// GDPR: PII must never reach log storage. Top-level and one-level-nested
// variants cover both direct fields and objects logged whole.
const piiFields = [
  'email',
  'phone',
  'displayName',
  'address',
  'ipAddress',
  'authorization',
  'tokenHash',
  'homeLocation',
  'stripePaymentIntentId',
  'stripeConnectAccountId',
];

export const redactPaths = [
  ...piiFields,
  ...piiFields.map((field) => `*.${field}`),
  'req.headers.authorization',
];

export function createLogger(
  options: { level?: string; pretty?: boolean } = {},
  destination?: DestinationStream,
): Logger {
  const base = {
    level: options.level ?? 'info',
    redact: { paths: redactPaths, censor: '[redacted]' },
  };

  if (destination) {
    return pino(base, destination);
  }
  if (options.pretty) {
    return pino({ ...base, transport: { target: 'pino-pretty' } });
  }
  return pino(base);
}

let cached: Logger | undefined;

export function getLogger(): Logger {
  if (!cached) {
    const env = getEnv();
    cached = createLogger({
      level: env.LOG_LEVEL,
      pretty: env.NODE_ENV === 'development',
    });
  }
  return cached;
}
