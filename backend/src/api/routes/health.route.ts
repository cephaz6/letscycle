import { Router } from 'express';

export const healthRouter = Router();

// Liveness only for now; readiness (DB ping) arrives with build step 2.
healthRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
