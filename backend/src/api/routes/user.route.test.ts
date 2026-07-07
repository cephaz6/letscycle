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
const password = 'a-strong-password';

describe.skipIf(!hasDb)('users API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let token: string;
  let userId: string;

  async function registerUser(): Promise<{ email: string; token: string; id: string }> {
    const email = `users-api-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Api Profile' });
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const body = login.body as { userId: string; accessToken: string };
    return {
      email,
      token: body.accessToken,
      id: (signup.body as { userId: string }).userId,
    };
  }

  beforeAll(async () => {
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
    });
    const user = await registerUser();
    token = user.token;
    userId = user.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.refreshToken.deleteMany({
      where: { user: { email: { contains: `users-api-${runId}` } } },
    });
    await db.outbox.deleteMany({ where: { aggregateId: userId } });
    await db.user.deleteMany({ where: { email: { contains: `users-api-${runId}` } } });
    await disconnectDb();
  });

  it('GET /users/me requires a bearer token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /users/me returns the caller profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body['id']).toBe(userId);
    expect(body).toHaveProperty('email');
    expect(body).not.toHaveProperty('cognitoSub');
  });

  it('PATCH /users/me updates the profile', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Updated Name',
        homeLocation: { lat: 53.4084, lng: -2.9916, accuracyMetres: 750 },
      });

    expect(res.status).toBe(200);
    const body = res.body as { displayName: string; homeLocation: { lat: number } };
    expect(body.displayName).toBe('Updated Name');
    expect(body.homeLocation.lat).toBeCloseTo(53.4084, 4);
  });

  it('PATCH /users/me rejects an empty body', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('PATCH /users/me rejects unknown fields', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayname: 'typo-key' });

    expect(res.status).toBe(400);
  });

  it('PATCH /users/me rejects an out-of-range latitude', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ homeLocation: { lat: 999, lng: 0, accuracyMetres: 100 } });

    expect(res.status).toBe(400);
  });

  it('GET /users/:userId returns a public profile without PII', async () => {
    const other = await registerUser();

    const res = await request(app)
      .get(`/api/v1/users/${other.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body['id']).toBe(other.id);
    expect(body).toHaveProperty('displayName');
    expect(body).not.toHaveProperty('email');
    expect(body).not.toHaveProperty('phone');
  });

  it('GET /users/:userId 400s on a malformed id', async () => {
    const res = await request(app)
      .get('/api/v1/users/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('GET /users/:userId 404s for an unknown user', async () => {
    const res = await request(app)
      .get(`/api/v1/users/${randomUUID()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
