import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { AuthService, createDummyCognito } from '../../services/auth/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const email = `auth-api-${runId}@example.com`;
const password = 'a-strong-password';

describe.skipIf(!hasDb)('auth API', () => {
  const { client } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let userId: string;

  beforeAll(() => {
    app = createApp({ authService: new AuthService(client, getDb()) });
  });

  afterAll(async () => {
    const db = getDb();
    await db.refreshToken.deleteMany({ where: { userId } });
    await db.outbox.deleteMany({ where: { aggregateId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
    await disconnectDb();
  });

  it('POST /auth/signup creates an account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Api Tester' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
    userId = (res.body as { userId: string }).userId;
  });

  it('rejects an invalid signup body with a 400 and readable error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'not-an-email', password: 'short', displayName: '' });

    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe('badRequest');
    expect(body.error.message).toContain('email');
  });

  it('duplicate signup returns 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Api Tester' });

    expect(res.status).toBe(409);
  });

  it('POST /auth/login returns a session', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body['accessToken']).toBeTruthy();
    expect(body['refreshToken']).toBeTruthy();
    expect(body['userId']).toBe(userId);
  });

  it('login with wrong credentials returns 401 without detail leakage', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong' });

    expect(res.status).toBe(401);
    const body = res.body as { error: { message: string } };
    expect(body.error.message).toBe('Invalid credentials');
  });

  it('POST /auth/refresh rotates the session', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const { refreshToken } = login.body as { refreshToken: string };

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    const body = res.body as { refreshToken: string };
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('POST /auth/logout revokes and returns 204', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const { refreshToken } = login.body as { refreshToken: string };

    const logout = await request(app).post('/api/v1/auth/logout').send({ refreshToken });
    expect(logout.status).toBe(204);

    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });
});
