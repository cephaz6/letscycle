import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import {
  listNearbyMeetPoints,
  startSafeTransit,
  updateSafeTransit,
} from '../../services/safety/index.js';

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(50).default(10),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const startSchema = z
  .object({ liveLocationShareEnabled: z.boolean().optional() })
  .strict();

const updateSchema = z
  .object({
    liveLocationShareEnabled: z.boolean(),
    trustedContactNotified: z.boolean(),
    confirmArrival: z.boolean(),
    triggerDuress: z.boolean(),
    end: z.boolean(),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  });

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function uuidParam(req: Request, name: string): string {
  const parsed = z.uuid().safeParse(req.params[name]);
  if (!parsed.success) {
    throw new BadRequestError(`Invalid ${name}`);
  }
  return parsed.data;
}

export function createSafetyRouter(verifier: TokenVerifier): Router {
  const router = Router();
  const auth = requireAuth(verifier);

  router.get('/meet-points', auth, async (req, res) => {
    const q = nearbyQuerySchema.safeParse(req.query);
    if (!q.success) {
      throw new BadRequestError(q.error.issues[0]?.message ?? 'Invalid query');
    }
    res.status(200).json(await listNearbyMeetPoints(q.data));
  });

  router.post(
    '/transactions/:id/safe-transit',
    auth,
    validateBody(startSchema),
    async (req, res) => {
      const id = uuidParam(req, 'id');
      const body = req.body as z.infer<typeof startSchema>;
      res.status(201).json(await startSafeTransit(id, requireUserId(req), body));
    },
  );

  router.patch(
    '/safe-transit/:id',
    auth,
    validateBody(updateSchema),
    async (req, res) => {
      const id = uuidParam(req, 'id');
      const body = req.body as z.infer<typeof updateSchema>;
      res.status(200).json(await updateSafeTransit(id, requireUserId(req), body));
    },
  );

  return router;
}
