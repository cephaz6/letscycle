import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { createFakeCognito } from '../../services/auth/index.js';
import { requireAuth } from './auth.js';
import { errorHandler } from './error.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const email = `mw-test-${runId}@example.com`;

describe.skipIf(!hasDb)('requireAuth middleware', () => {
  const fake = createFakeCognito('test-secret-at-least-16-chars');
  const otherFake = createFakeCognito('a-completely-different-secret');
  let app: express.Express;
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    const { cognitoSub } = await fake.client.signUp({ email, password: 'pw-123456' });
    const user = await getDb().user.create({
      data: { email, displayName: 'MW Tester', cognitoSub },
    });
    userId = user.id;
    const session = await fake.client.initiateAuth({ email, password: 'pw-123456' });
    accessToken = session.accessToken;

    app = express();
    app.get('/protected', requireAuth(fake.verifier), (req, res) => {
      res.json({ userId: req.user?.id, roles: req.user?.roles });
    });
    app.use(errorHandler);
  });

  afterAll(async () => {
    await getDb().user.deleteMany({ where: { id: userId } });
    await disconnectDb();
  });

  it('rejects requests without a bearer token', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
  });

  it('rejects tokens signed with the wrong key', async () => {
    await otherFake.client.signUp({ email: `x-${email}`, password: 'pw-123456' });
    const bad = await otherFake.client.initiateAuth({
      email: `x-${email}`,
      password: 'pw-123456',
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${bad.accessToken}`);

    expect(res.status).toBe(401);
  });

  it('rejects valid tokens for users that do not exist', async () => {
    const ghostEmail = `ghost-${email}`;
    await fake.client.signUp({ email: ghostEmail, password: 'pw-123456' });
    const ghost = await fake.client.initiateAuth({
      email: ghostEmail,
      password: 'pw-123456',
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${ghost.accessToken}`);

    expect(res.status).toBe(401);
  });

  it('attaches the mapped user on success', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId, roles: ['user'] });
  });

  it('rejects suspended accounts', async () => {
    await getDb().user.update({
      where: { id: userId },
      data: { accountStatus: 'suspended' },
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(401);

    await getDb().user.update({
      where: { id: userId },
      data: { accountStatus: 'active' },
    });
  });
});
