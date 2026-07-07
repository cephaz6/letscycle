import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import { createDummyStorage } from './storage.dummy.js';
import { StorageService } from './storage.service.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const bucket = 'test-bucket';

describe.skipIf(!hasDb)('StorageService', () => {
  const storage = new StorageService(createDummyStorage(), bucket, getDb());
  let ownerId: string;
  let otherId: string;

  async function makeUser(): Promise<string> {
    const user = await getDb().user.create({
      data: {
        email: `storage-${runId}-${randomUUID().slice(0, 6)}@example.com`,
        displayName: 'Storage Tester',
        cognitoSub: randomUUID(),
      },
      select: { id: true },
    });
    return user.id;
  }

  beforeAll(async () => {
    ownerId = await makeUser();
    otherId = await makeUser();
  });

  afterAll(async () => {
    const db = getDb();
    await db.s3Object.deleteMany({ where: { ownerUserId: { in: [ownerId, otherId] } } });
    await db.user.deleteMany({ where: { email: { contains: `storage-${runId}` } } });
    await disconnectDb();
  });

  it('creates a pending s3Object and a scoped presigned URL', async () => {
    const result = await storage.createUpload({
      ownerUserId: ownerId,
      purpose: 'avatar',
      contentType: 'image/png',
      sizeBytes: 1024,
    });

    expect(result.bucket).toBe(bucket);
    expect(result.key).toMatch(new RegExp(`^avatar/${ownerId}/.+\\.png$`));
    expect(result.uploadUrl).toContain(result.key);
    expect(result.expiresInSeconds).toBe(15 * 60);

    const row = await getDb().s3Object.findUnique({ where: { id: result.s3ObjectId } });
    expect(row?.lifecycleStatus).toBe('pending');
    expect(row?.ownerUserId).toBe(ownerId);
  });

  it('rejects unsupported content types', async () => {
    await expect(
      storage.createUpload({
        ownerUserId: ownerId,
        purpose: 'avatar',
        // @ts-expect-error — deliberately unsupported
        contentType: 'application/pdf',
        sizeBytes: 1024,
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects oversized uploads', async () => {
    await expect(
      storage.createUpload({
        ownerUserId: ownerId,
        purpose: 'listingPhoto',
        contentType: 'image/jpeg',
        sizeBytes: 50 * 1024 * 1024,
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('confirmUpload marks the object confirmed and is idempotent', async () => {
    const created = await storage.createUpload({
      ownerUserId: ownerId,
      purpose: 'avatar',
      contentType: 'image/webp',
      sizeBytes: 2048,
    });

    await storage.confirmUpload(created.s3ObjectId, ownerId);
    let row = await getDb().s3Object.findUnique({ where: { id: created.s3ObjectId } });
    expect(row?.lifecycleStatus).toBe('confirmed');

    await expect(
      storage.confirmUpload(created.s3ObjectId, ownerId),
    ).resolves.toBeUndefined();
    row = await getDb().s3Object.findUnique({ where: { id: created.s3ObjectId } });
    expect(row?.lifecycleStatus).toBe('confirmed');
  });

  it('confirmUpload forbids confirming someone else’s upload', async () => {
    const created = await storage.createUpload({
      ownerUserId: ownerId,
      purpose: 'avatar',
      contentType: 'image/png',
      sizeBytes: 1024,
    });

    await expect(storage.confirmUpload(created.s3ObjectId, otherId)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('confirmUpload 404s for an unknown object', async () => {
    await expect(storage.confirmUpload(randomUUID(), ownerId)).rejects.toThrow(
      NotFoundError,
    );
  });
});
