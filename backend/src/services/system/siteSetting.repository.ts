import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';

type Db = PrismaClient | Tx;

export const PUBLIC_KEY_PREFIX = 'public.';

export interface SettingSeed {
  key: string;
  value: Prisma.InputJsonValue;
  description: string;
}

// Idempotent seed: inserts missing keys, refreshes description/value on
// existing ones. Safe to run on every deploy.
export async function upsertSettings(db: Db, seeds: SettingSeed[]): Promise<void> {
  for (const seed of seeds) {
    await db.siteSetting.upsert({
      where: { key: seed.key },
      create: seed,
      update: { value: seed.value, description: seed.description },
    });
  }
}

export async function findByKey(
  db: Db,
  key: string,
): Promise<{ value: Prisma.JsonValue } | null> {
  return db.siteSetting.findUnique({ where: { key }, select: { value: true } });
}

export async function findPublic(
  db: Db,
): Promise<{ key: string; value: Prisma.JsonValue }[]> {
  return db.siteSetting.findMany({
    where: { key: { startsWith: PUBLIC_KEY_PREFIX } },
    select: { key: true, value: true },
    orderBy: { key: 'asc' },
  });
}
