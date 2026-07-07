import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import { expressInterest } from '../../services/matching/index.js';

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function candidateId(req: Request): string {
  const parsed = z.uuid().safeParse(req.params.candidateId);
  if (!parsed.success) {
    throw new BadRequestError('Invalid candidateId');
  }
  return parsed.data;
}

export function createMatchRouter(verifier: TokenVerifier): Router {
  const router = Router();
  const auth = requireAuth(verifier);

  router.post('/matches/:candidateId/interest', auth, async (req, res) => {
    res.status(200).json(await expressInterest(candidateId(req), requireUserId(req)));
  });

  return router;
}
