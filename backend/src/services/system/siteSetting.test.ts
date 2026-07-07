import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import {
  getPublicSettings,
  getSettingValue,
  seedDefaultSiteSettings,
} from './siteSetting.service.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('siteSetting service', () => {
  beforeAll(async () => {
    await seedDefaultSiteSettings(getDb());
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('seeding is idempotent', async () => {
    const before = await getDb().siteSetting.count();
    await seedDefaultSiteSettings(getDb());
    const after = await getDb().siteSetting.count();
    expect(after).toBe(before);
  });

  it('exposes only public.* settings, with the prefix stripped', async () => {
    const settings = await getPublicSettings(getDb());

    expect(settings).toHaveProperty('defaultDistanceKm');
    expect(settings).toHaveProperty('commissionBps', 500);
    // Internal keys must never surface.
    expect(settings).not.toHaveProperty('matching.weights');
    expect(settings).not.toHaveProperty('weights');
    for (const key of Object.keys(settings)) {
      expect(key.startsWith('public.')).toBe(false);
    }
  });

  it('reads an internal setting by full key', async () => {
    const weights = await getSettingValue<Record<string, number>>(
      'matching.weights',
      getDb(),
    );
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('throws for an unknown key', async () => {
    await expect(getSettingValue('does.not.exist', getDb())).rejects.toThrow();
  });
});
