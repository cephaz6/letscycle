import { z } from 'zod';

// Vars for modules not yet built stay optional; each build step tightens the
// ones it starts depending on. Runtime code that needs an optional var must
// assert it via requireEnv().
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url().optional(),
  AWS_REGION: z.string().optional(),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  // Google OAuth client ID — enables "Continue with Google" (verifies the ID
  // token's audience). Optional until Google sign-in is configured.
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Signs dummy-Cognito dev tokens; forbidden in production (server enforces).
  AUTH_DEV_TOKEN_SECRET: z.string().min(16).optional(),
  S3_BUCKET_UPLOADS: z.string().optional(),
  STRIPE_SECRET_KEY_SECRET_ARN: z.string().optional(),
  STRIPE_WEBHOOK_SECRET_SECRET_ARN: z.string().optional(),
  SES_FROM_EMAIL: z.email().optional(),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY_SECRET_ARN: z.string().optional(),
  FRONTEND_ORIGIN: z.url().optional(),
  // Browser-reachable origin of this API (dev presigned uploads point here).
  PUBLIC_API_ORIGIN: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    try {
      process.loadEnvFile();
    } catch {
      // no .env file — the environment itself must provide the vars
    }
    cached = parseEnv(process.env);
  }
  return cached;
}

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
