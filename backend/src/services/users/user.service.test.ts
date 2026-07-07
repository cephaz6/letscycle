import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { NotFoundError } from '../../shared/errors/httpErrors.js';
import { getMyProfile, getPublicProfile, updateMyProfile } from './user.service.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);

async function makeUser(overrides: { accountStatus?: 'active' | 'suspended' } = {}) {
  return getDb().user.create({
    data: {
      email: `users-svc-${runId}-${randomUUID().slice(0, 6)}@example.com`,
      displayName: 'Profile Tester',
      cognitoSub: randomUUID(),
      ...overrides,
    },
    select: { id: true, email: true },
  });
}

describe.skipIf(!hasDb)('users service', () => {
  const createdIds: string[] = [];

  beforeEach(() => {
    createdIds.length = 0;
  });

  afterAll(async () => {
    await getDb().user.deleteMany({
      where: { email: { contains: `users-svc-${runId}` } },
    });
    await disconnectDb();
  });

  it('getMyProfile returns the full private view', async () => {
    const user = await makeUser();

    const profile = await getMyProfile(user.id);

    expect(profile.id).toBe(user.id);
    expect(profile.email).toBe(user.email);
    expect(profile.displayName).toBe('Profile Tester');
    expect(profile.homeLocation).toBeNull();
    expect(profile.preferences).toEqual({});
    expect(profile).not.toHaveProperty('cognitoSub');
  });

  it('updateMyProfile changes scalar fields', async () => {
    const user = await makeUser();

    const updated = await updateMyProfile(user.id, {
      displayName: 'Renamed',
      phone: '+44 7700 900000',
    });

    expect(updated.displayName).toBe('Renamed');
    expect(updated.phone).toBe('+44 7700 900000');
  });

  it('round-trips a home location through PostGIS', async () => {
    const user = await makeUser();

    const updated = await updateMyProfile(user.id, {
      homeLocation: { lat: 53.4084, lng: -2.9916, accuracyMetres: 500 },
    });

    expect(updated.homeLocation).not.toBeNull();
    expect(updated.homeLocation?.lat).toBeCloseTo(53.4084, 5);
    expect(updated.homeLocation?.lng).toBeCloseTo(-2.9916, 5);
    expect(updated.homeLocation?.accuracyMetres).toBe(500);

    // Persisted, not just echoed back.
    const reread = await getMyProfile(user.id);
    expect(reread.homeLocation?.lat).toBeCloseTo(53.4084, 5);
  });

  it('clears a home location when set to null', async () => {
    const user = await makeUser();
    await updateMyProfile(user.id, {
      homeLocation: { lat: 53.4, lng: -2.99, accuracyMetres: 500 },
    });

    const cleared = await updateMyProfile(user.id, { homeLocation: null });

    expect(cleared.homeLocation).toBeNull();
  });

  it('merges preferences as provided', async () => {
    const user = await makeUser();

    const updated = await updateMyProfile(user.id, {
      preferences: { defaultDistanceKm: 25 },
    });

    expect(updated.preferences.defaultDistanceKm).toBe(25);
  });

  it('getPublicProfile exposes only safe fields', async () => {
    const user = await makeUser();

    const profile = await getPublicProfile(user.id);

    expect(profile.id).toBe(user.id);
    expect(profile.displayName).toBe('Profile Tester');
    expect(profile.isEmailVerified).toBe(false);
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('phone');
    expect(profile).not.toHaveProperty('homeLocation');
  });

  it('getPublicProfile 404s for a suspended account', async () => {
    const user = await makeUser({ accountStatus: 'suspended' });

    await expect(getPublicProfile(user.id)).rejects.toThrow(NotFoundError);
  });

  it('404s for a non-existent user', async () => {
    await expect(getMyProfile(randomUUID())).rejects.toThrow(NotFoundError);
    await expect(getPublicProfile(randomUUID())).rejects.toThrow(NotFoundError);
  });
});
