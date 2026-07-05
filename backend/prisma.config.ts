import { defineConfig } from 'prisma/config';

// Prisma 7 no longer auto-loads .env; Node 20.12+ can do it natively.
try {
  process.loadEnvFile();
} catch {
  // no .env file (e.g. CI) — env vars come from the environment itself
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
