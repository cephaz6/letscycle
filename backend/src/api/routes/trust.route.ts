import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import { raiseFlag, submitReview } from '../../services/trust/index.js';

const reviewSchema = z
  .object({
    transactionId: z.uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const flagSchema = z
  .object({
    targetType: z.enum(['user', 'listing', 'message']),
    targetId: z.uuid(),
    reason: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export function createTrustRouter(verifier: TokenVerifier): Router {
  const router = Router();
  const auth = requireAuth(verifier);

  router.post('/reviews', auth, validateBody(reviewSchema), async (req, res) => {
    const body = req.body as z.infer<typeof reviewSchema>;
    res.status(201).json(
      await submitReview(requireUserId(req), {
        transactionId: body.transactionId,
        rating: body.rating,
        ...(body.comment !== undefined && { comment: body.comment }),
      }),
    );
  });

  router.post('/flags', auth, validateBody(flagSchema), async (req, res) => {
    const body = req.body as z.infer<typeof flagSchema>;
    res.status(201).json(
      await raiseFlag(requireUserId(req), {
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        ...(body.description !== undefined && { description: body.description }),
      }),
    );
  });

  return router;
}
