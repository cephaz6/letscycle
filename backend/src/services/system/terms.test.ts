import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import {
  acceptCurrentTerms,
  getCurrentTermsVersion,
  hasAcceptedCurrentTerms,
} from './terms.service.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);

describe.skipIf(!hasDb)('terms service', () => {
  let userId: string;

  beforeAll(async () => {
    const user = await getDb().user.create({
      data: {
        email: `terms-${runId}@example.com`,
        displayName: 'Terms Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await getDb().termsAcceptance.deleteMany({ where: { userId } });
    await getDb().user.deleteMany({ where: { id: userId } });
    await disconnectDb();
  });

  it('exposes a current version', () => {
    expect(getCurrentTermsVersion()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('records acceptance and reports it', async () => {
    expect(await hasAcceptedCurrentTerms(userId, getDb())).toBe(false);

    const result = await acceptCurrentTerms(userId, getDb());
    expect(result.termsVersion).toBe(getCurrentTermsVersion());

    expect(await hasAcceptedCurrentTerms(userId, getDb())).toBe(true);
  });

  it('accepting twice is idempotent (unique constraint honoured)', async () => {
    await acceptCurrentTerms(userId, getDb());
    await acceptCurrentTerms(userId, getDb());

    const count = await getDb().termsAcceptance.count({
      where: { userId, termsVersion: getCurrentTermsVersion() },
    });
    expect(count).toBe(1);
  });
});
