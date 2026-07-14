import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import {
  deleteMyAccount,
  exportMyData,
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  type UpdateProfileInput,
} from '../../services/users/index.js';
import { recordAudit } from '../../services/system/index.js';

const homeLocationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracyMetres: z.number().int().positive().max(100_000),
  })
  .strict();

const preferencesSchema = z
  .object({
    defaultDistanceKm: z.number().int().positive().max(500).optional(),
    notificationDefaults: z.record(z.string(), z.boolean()).optional(),
  })
  .strict();

// Every key optional (partial update), but reject an empty body and unknown
// keys so typos like "displayname" fail loudly rather than silently no-op.
const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    phone: z
      .string()
      .regex(/^\+?[0-9 ]{6,20}$/, 'Invalid phone number')
      .nullable(),
    avatarUrl: z.url().max(2048).nullable(),
    homeLocation: homeLocationSchema.nullable(),
    preferences: preferencesSchema,
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  });

export function createUserRouter(verifier: TokenVerifier): Router {
  const router = Router();
  const auth = requireAuth(verifier);

  router.get('/users/me', auth, async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.status(200).json(await getMyProfile(req.user.id));
  });

  router.patch('/users/me', auth, validateBody(updateProfileSchema), async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const updated = await updateMyProfile(req.user.id, req.body as UpdateProfileInput);
    res.status(200).json(updated);
  });

  // GDPR data portability — the caller's own data as JSON.
  router.get('/users/me/export', auth, async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const data = await exportMyData(req.user.id);
    await recordAudit({
      actorUserId: req.user.id,
      action: 'user.dataExported',
      targetType: 'user',
      targetId: req.user.id,
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });
    res.status(200).json(data);
  });

  // GDPR erasure — anonymise the account and revoke access.
  router.delete('/users/me', auth, async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    await deleteMyAccount(req.user.id);
    await recordAudit({
      actorUserId: req.user.id,
      action: 'user.accountDeleted',
      targetType: 'user',
      targetId: req.user.id,
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });
    res.status(204).end();
  });

  router.get('/users/:userId', auth, async (req, res) => {
    const userId = z.uuid().safeParse(req.params.userId);
    if (!userId.success) {
      throw new BadRequestError('Invalid user id');
    }
    res.status(200).json(await getPublicProfile(userId.data));
  });

  return router;
}
