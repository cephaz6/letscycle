import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import type {
  PayoutService,
  TransactionService,
} from '../../services/transactions/index.js';

export interface TransactionRouterDeps {
  tokenVerifier: TokenVerifier;
  transactionService: TransactionService;
  payoutService: PayoutService;
}

const createSchema = z
  .object({
    listingId: z.uuid(),
    agreedPickupAt: z.coerce.date().nullable().optional(),
  })
  .strict();

const disputeSchema = z
  .object({
    reason: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(5000),
  })
  .strict();

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

export function createTransactionRouter(deps: TransactionRouterDeps): Router {
  const router = Router();
  const auth = requireAuth(deps.tokenVerifier);
  const { transactionService: transactions, payoutService: payouts } = deps;

  // --- payouts (declared before /transactions/:id to avoid path clashes) ---
  router.post('/payouts/onboard', auth, async (req, res) => {
    res.status(200).json(await payouts.onboard(requireUserId(req)));
  });

  router.get('/payouts/status', auth, async (req, res) => {
    res.status(200).json(await payouts.getStatus(requireUserId(req)));
  });

  // --- transactions ---
  router.get('/transactions/me', auth, async (req, res) => {
    res.status(200).json(await transactions.listMyTransactions(requireUserId(req)));
  });

  router.post('/transactions', auth, validateBody(createSchema), async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    res.status(201).json(
      await transactions.createTransaction({
        buyerId: requireUserId(req),
        listingId: body.listingId,
        ...(body.agreedPickupAt !== undefined && { agreedPickupAt: body.agreedPickupAt }),
      }),
    );
  });

  router.get('/transactions/:id', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    res.status(200).json(await transactions.getTransaction(id, requireUserId(req)));
  });

  router.post('/transactions/:id/confirm', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    res.status(200).json(await transactions.confirmTransaction(id, requireUserId(req)));
  });

  router.post('/transactions/:id/complete', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    res.status(200).json(await transactions.completeTransaction(id, requireUserId(req)));
  });

  router.post(
    '/transactions/:id/dispute',
    auth,
    validateBody(disputeSchema),
    async (req, res) => {
      const id = uuidParam(req, 'id');
      const body = req.body as z.infer<typeof disputeSchema>;
      res
        .status(201)
        .json(await transactions.disputeTransaction(id, requireUserId(req), body));
    },
  );

  return router;
}
