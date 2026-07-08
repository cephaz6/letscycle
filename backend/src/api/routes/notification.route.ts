import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import type { NotificationService } from '../../services/notifications/index.js';

export interface NotificationRouterDeps {
  tokenVerifier: TokenVerifier;
  notificationService: NotificationService;
}

const channel = z.enum(['inApp', 'webPush']);
const channels = z.array(channel).max(2);

const subscribeSchema = z
  .object({
    endpoint: z.url().max(2048),
    keys: z.record(z.string(), z.string()),
    userAgent: z.string().max(512).optional(),
  })
  .strict();

// Partial by design — only the provided notification types are changed.
const preferencesSchema = z
  .object({
    matchFound: channels,
    messageReceived: channels,
    transactionUpdate: channels,
    reviewReceived: channels,
    system: channels,
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one notification type must be provided',
  });

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
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

export function createNotificationRouter(deps: NotificationRouterDeps): Router {
  const router = Router();
  const auth = requireAuth(deps.tokenVerifier);
  const service = deps.notificationService;

  router.get('/notifications', auth, async (req, res) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) {
      throw new BadRequestError('Invalid query');
    }
    res
      .status(200)
      .json(await service.list(requireUserId(req), q.data.limit, q.data.offset));
  });

  router.patch('/notifications/:id/read', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    await service.markRead(id, requireUserId(req));
    res.status(204).end();
  });

  router.post(
    '/notifications/subscribe',
    auth,
    validateBody(subscribeSchema),
    async (req, res) => {
      const body = req.body as z.infer<typeof subscribeSchema>;
      await service.subscribe(requireUserId(req), {
        endpoint: body.endpoint,
        keys: body.keys,
        userAgent: body.userAgent ?? 'unknown',
      });
      res.status(204).end();
    },
  );

  router.get('/notifications/preferences', auth, async (req, res) => {
    res.status(200).json(await service.getPreferences(requireUserId(req)));
  });

  router.patch(
    '/notifications/preferences',
    auth,
    validateBody(preferencesSchema),
    async (req, res) => {
      const body = req.body as z.infer<typeof preferencesSchema>;
      res.status(200).json(await service.updatePreferences(requireUserId(req), body));
    },
  );

  return router;
}
