import type { Prisma, PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { NotFoundError } from '../../shared/errors/httpErrors.js';
import * as repo from './siteSetting.repository.js';
import { PUBLIC_KEY_PREFIX, type SettingSeed } from './siteSetting.repository.js';
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from './storage.types.js';

// Default settings. `public.*` keys are exposed via GET /site-settings/public;
// everything else is server-internal (matching weights, hold periods).
// Upload limits are mirrored from storage constants (single source of truth).
const DEFAULT_SETTINGS: SettingSeed[] = [
  {
    key: 'public.defaultDistanceKm',
    value: 10,
    description: 'Default search/match radius in kilometres',
  },
  {
    key: 'public.commissionBps',
    value: 500,
    description: 'Platform commission on sales, in basis points (500 = 5%)',
  },
  {
    key: 'public.upload.maxSizeBytes',
    value: MAX_UPLOAD_BYTES,
    description: 'Maximum upload size in bytes',
  },
  {
    key: 'public.upload.allowedContentTypes',
    value: [...ALLOWED_UPLOAD_TYPES],
    description: 'Allowed image content types for uploads',
  },
  {
    key: 'matching.weights',
    value: { proximity: 0.4, keyword: 0.3, trust: 0.2, urgency: 0.1 },
    description: 'Composite match score weights (must sum to 1)',
  },
  {
    key: 'matching.topN',
    value: 10,
    description: 'Number of candidates notified per new listing',
  },
  {
    key: 'transaction.holdPeriodHours',
    value: 48,
    description: 'Escrow hold period before payout, in hours',
  },
];

export async function seedDefaultSiteSettings(
  db: PrismaClient = getDb(),
): Promise<number> {
  await repo.upsertSettings(db, DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS.length;
}

export async function getPublicSettings(
  db: PrismaClient = getDb(),
): Promise<Record<string, Prisma.JsonValue>> {
  const rows = await repo.findPublic(db);
  // Strip the `public.` prefix so clients see clean keys.
  return Object.fromEntries(
    rows.map((row) => [row.key.slice(PUBLIC_KEY_PREFIX.length), row.value]),
  );
}

export async function getSettingValue<T = Prisma.JsonValue>(
  key: string,
  db: PrismaClient = getDb(),
): Promise<T> {
  const row = await repo.findByKey(db, key);
  if (!row) {
    throw new NotFoundError(`Site setting not found: ${key}`);
  }
  return row.value as T;
}
