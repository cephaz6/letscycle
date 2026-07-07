import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import {
  createWishlistItem,
  deleteWishlistItem,
  listMyWishlist,
  updateWishlistItem,
  type CreateWishlistItemInput,
  type UpdateWishlistItemInput,
} from '../../services/wishlists/index.js';

const listingTypePreference = z.enum(['sell', 'giveaway', 'both']);
const keywords = z.array(z.string().trim().min(1).max(50)).max(20);

const createSchema = z
  .object({
    categoryId: z.uuid().nullable().optional(),
    keywords: keywords.optional(),
    maxPricePence: z.number().int().positive().max(100_000_000).nullable().optional(),
    maxDistanceKm: z.number().int().positive().max(500),
    listingTypePreference: listingTypePreference.optional(),
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .strict();

const updateSchema = z
  .object({
    categoryId: z.uuid().nullable(),
    keywords,
    maxPricePence: z.number().int().positive().max(100_000_000).nullable(),
    maxDistanceKm: z.number().int().positive().max(500),
    listingTypePreference,
    status: z.enum(['active', 'paused']),
    expiresAt: z.coerce.date().nullable(),
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

export function createWishlistRouter(verifier: TokenVerifier): Router {
  const router = Router();
  const auth = requireAuth(verifier);

  router.get('/wishlists', auth, async (req, res) => {
    res.status(200).json(await listMyWishlist(requireUserId(req)));
  });

  router.post('/wishlists', auth, validateBody(createSchema), async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const input: CreateWishlistItemInput = {
      userId: requireUserId(req),
      maxDistanceKm: body.maxDistanceKm,
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.keywords !== undefined && { keywords: body.keywords }),
      ...(body.maxPricePence !== undefined && { maxPricePence: body.maxPricePence }),
      ...(body.listingTypePreference !== undefined && {
        listingTypePreference: body.listingTypePreference,
      }),
      ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt }),
    };
    res.status(201).json(await createWishlistItem(input));
  });

  router.patch('/wishlists/:id', auth, validateBody(updateSchema), async (req, res) => {
    const id = uuidParam(req, 'id');
    const body = req.body as UpdateWishlistItemInput;
    res.status(200).json(await updateWishlistItem(id, requireUserId(req), body));
  });

  router.delete('/wishlists/:id', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    await deleteWishlistItem(id, requireUserId(req));
    res.status(204).end();
  });

  return router;
}
