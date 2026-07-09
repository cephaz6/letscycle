import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import {
  getMessages,
  listConversations,
  sendMessage,
  startConversation,
} from '../../services/messaging/index.js';

const startSchema = z.object({ listingId: z.uuid() }).strict();

const sendSchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
    attachments: z.array(z.uuid()).max(10).optional(),
  })
  .strict();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
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

export function createConversationRouter(verifier: TokenVerifier): Router {
  const router = Router();
  const auth = requireAuth(verifier);

  router.get('/conversations', auth, async (req, res) => {
    res.status(200).json(await listConversations(requireUserId(req)));
  });

  router.post('/conversations', auth, validateBody(startSchema), async (req, res) => {
    const { listingId } = req.body as z.infer<typeof startSchema>;
    res.status(201).json(await startConversation(requireUserId(req), listingId));
  });

  router.get('/conversations/:id/messages', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) {
      throw new BadRequestError('Invalid query');
    }
    res
      .status(200)
      .json(await getMessages(id, requireUserId(req), q.data.limit, q.data.offset));
  });

  router.post(
    '/conversations/:id/messages',
    auth,
    validateBody(sendSchema),
    async (req, res) => {
      const id = uuidParam(req, 'id');
      const body = req.body as z.infer<typeof sendSchema>;
      res.status(201).json(
        await sendMessage(id, requireUserId(req), {
          body: body.body,
          ...(body.attachments !== undefined && { attachments: body.attachments }),
        }),
      );
    },
  );

  return router;
}
