import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { AuthService, createDummyCognito } from '../../services/auth/index.js';
import {
  StorageService,
  createDummyStorage,
  seedDefaultSiteSettings,
} from '../../services/system/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';

describe.skipIf(!hasDb)('system API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await seedDefaultSiteSettings(getDb());
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
      storageService: new StorageService(createDummyStorage(), 'test-bucket', getDb()),
    });

    const email = `system-api-${runId}@example.com`;
    await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'System Tester' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const body = login.body as { userId: string; accessToken: string };
    token = body.accessToken;
    userId = body.userId;
  });

  afterAll(async () => {
    const db = getDb();
    await db.s3Object.deleteMany({ where: { ownerUserId: userId } });
    await db.termsAcceptance.deleteMany({ where: { userId } });
    await db.refreshToken.deleteMany({ where: { userId } });
    await db.outbox.deleteMany({ where: { aggregateId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
    await disconnectDb();
  });

  it('GET /site-settings/public is open and returns only public settings', async () => {
    const res = await request(app).get('/api/v1/site-settings/public');

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('defaultDistanceKm');
    expect(body).not.toHaveProperty('matching.weights');
  });

  it('GET /terms/current returns the current version', async () => {
    const res = await request(app).get('/api/v1/terms/current');

    expect(res.status).toBe(200);
    expect((res.body as { version: string }).version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('POST /uploads requires auth', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .send({ purpose: 'avatar', contentType: 'image/png', sizeBytes: 1024 });

    expect(res.status).toBe(401);
  });

  it('POST /uploads returns a presigned URL and pending object', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ purpose: 'avatar', contentType: 'image/png', sizeBytes: 1024 });

    expect(res.status).toBe(201);
    const body = res.body as { uploadUrl: string; s3ObjectId: string; key: string };
    expect(body.uploadUrl).toContain('http');
    expect(body.key).toContain('avatar/');

    const row = await getDb().s3Object.findUnique({ where: { id: body.s3ObjectId } });
    expect(row?.lifecycleStatus).toBe('pending');
  });

  it('POST /uploads rejects an invalid content type', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ purpose: 'avatar', contentType: 'application/zip', sizeBytes: 1024 });

    expect(res.status).toBe(400);
  });

  it('POST /terms/acceptances records acceptance', async () => {
    const res = await request(app)
      .post('/api/v1/terms/acceptances')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(201);
    expect((res.body as { termsVersion: string }).termsVersion).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
