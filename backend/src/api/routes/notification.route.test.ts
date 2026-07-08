import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { disconnectDb, getDb } from '../../shared/db/client.js';
import { AuthService, createDummyCognito } from '../../services/auth/index.js';
import {
  NotificationService,
  createDummyPushSender,
} from '../../services/notifications/index.js';

try {
  process.loadEnvFile();
} catch {
  // no .env — CI provides DATABASE_URL directly
}

const hasDb = Boolean(process.env.DATABASE_URL);
const runId = randomUUID().slice(0, 8);
const password = 'a-strong-password';

describe.skipIf(!hasDb)('notifications API', () => {
  const { client, verifier } = createDummyCognito('test-secret-at-least-16-chars');
  let app: ReturnType<typeof createApp>;
  let token: string;
  let userId: string;
  let service: NotificationService;

  beforeAll(async () => {
    service = new NotificationService(createDummyPushSender(), getDb());
    app = createApp({
      authService: new AuthService(client, getDb()),
      tokenVerifier: verifier,
      notificationService: service,
    });
    const email = `notif-api-${runId}@example.com`;
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email, password, displayName: 'Notif Api' });
    userId = (signup.body as { userId: string }).userId;
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    token = (login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    const db = getDb();
    await db.notification.deleteMany({ where: { userId } });
    await db.pushSubscription.deleteMany({ where: { userId } });
    await db.notificationPreference.deleteMany({ where: { userId } });
    await db.outbox.deleteMany({ where: { aggregateType: 'notification' } });
    await db.refreshToken.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { email: { contains: `notif-api-${runId}` } } });
    await disconnectDb();
  });

  const authed = () => `Bearer ${token}`;

  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /notifications returns a page', async () => {
    await service.createAndDeliver({ userId, type: 'system', payload: { n: 1 } });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    const body = res.body as { items: unknown[]; total: number; limit: number };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.limit).toBe(20);
  });

  it('POST /notifications/subscribe registers a push subscription', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', authed())
      .send({
        endpoint: `https://push.example/${randomUUID()}`,
        keys: { p256dh: 'k', auth: 'a' },
        userAgent: 'jest',
      });
    expect(res.status).toBe(204);

    const count = await getDb().pushSubscription.count({ where: { userId } });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('rejects an invalid subscription body', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', authed())
      .send({ endpoint: 'not-a-url', keys: {} });
    expect(res.status).toBe(400);
  });

  it('GET/PATCH /notifications/preferences round-trips', async () => {
    const patch = await request(app)
      .patch('/api/v1/notifications/preferences')
      .set('Authorization', authed())
      .send({ matchFound: ['inApp'] });
    expect(patch.status).toBe(200);
    expect((patch.body as { matchFound: string[] }).matchFound).toEqual(['inApp']);

    const get = await request(app)
      .get('/api/v1/notifications/preferences')
      .set('Authorization', authed());
    expect((get.body as { matchFound: string[] }).matchFound).toEqual(['inApp']);
  });

  it('PATCH /notifications/:id/read marks read', async () => {
    const created = await service.createAndDeliver({
      userId,
      type: 'system',
      payload: {},
    });

    const res = await request(app)
      .patch(`/api/v1/notifications/${created.id}/read`)
      .set('Authorization', authed());
    expect(res.status).toBe(204);

    const row = await getDb().notification.findUnique({ where: { id: created.id } });
    expect(row?.readAt).not.toBeNull();
  });

  it('400s on a malformed notification id', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/not-a-uuid/read')
      .set('Authorization', authed());
    expect(res.status).toBe(400);
  });
});
