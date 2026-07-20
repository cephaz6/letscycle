import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import type { StorageService } from '../../services/system/index.js';
import {
  createListing,
  viewListing,
  updateListing,
  removeListing,
  searchListings,
  createPhotoUpload,
  confirmPhoto,
  favouriteListing,
  unfavouriteListing,
  listCategories,
  type CreateListingInput,
  type UpdateListingInput,
  type ViewSource,
} from '../../services/listings/index.js';

export interface ListingRouterDeps {
  tokenVerifier: TokenVerifier;
  storageService: StorageService;
}

const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracyMetres: z.number().int().positive().max(100_000),
  })
  .strict();

const conditionEnum = z.enum(['new', 'likeNew', 'good', 'fair', 'poor']);
const contentTypeEnum = z.enum(['image/jpeg', 'image/png', 'image/webp']);

const createListingSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().min(1).max(5000),
    categoryId: z.uuid(),
    condition: conditionEnum,
    listingType: z.enum(['sell', 'giveaway']),
    pricePence: z.number().int().positive().max(100_000_000).nullable().optional(),
    location: locationSchema,
    deadlineAt: z.coerce.date().nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    publish: z.boolean().optional(),
  })
  .strict();

const updateListingSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().min(1).max(5000),
    categoryId: z.uuid(),
    condition: conditionEnum,
    pricePence: z.number().int().positive().max(100_000_000).nullable(),
    location: locationSchema,
    deadlineAt: z.coerce.date().nullable(),
    attributes: z.record(z.string(), z.unknown()),
    status: z.enum(['draft', 'active']),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  });

const photoSchema = z
  .object({
    contentType: contentTypeEnum,
    sizeBytes: z.number().int().positive(),
    width: z.number().int().positive().max(20_000),
    height: z.number().int().positive().max(20_000),
    displayOrder: z.number().int().min(0).max(50),
  })
  .strict();

const searchSchema = z
  .object({
    categoryId: z.uuid().optional(),
    sellerId: z.uuid().optional(),
    listingType: z.enum(['sell', 'giveaway']).optional(),
    minPricePence: z.coerce.number().int().nonnegative().optional(),
    maxPricePence: z.coerce.number().int().nonnegative().optional(),
    keyword: z.string().trim().min(1).max(200).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(500).optional(),
    sort: z
      .enum(['recent', 'distance', 'priceAsc', 'priceDesc', 'relevance'])
      .default('recent'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: 'lat and lng must be provided together',
  });

function uuidParam(req: Request, name: string): string {
  const parsed = z.uuid().safeParse(req.params[name]);
  if (!parsed.success) {
    throw new BadRequestError(`Invalid ${name}`);
  }
  return parsed.data;
}

function requireUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export function createListingRouter(deps: ListingRouterDeps): Router {
  const router = Router();
  const auth = requireAuth(deps.tokenVerifier);
  const optional = optionalAuth(deps.tokenVerifier);
  const storage = deps.storageService;

  // Public reads (browse/detail work signed-out; writes below stay auth'd).
  router.get('/categories', optional, async (_req, res) => {
    res.status(200).json(await listCategories());
  });

  router.post('/listings', auth, validateBody(createListingSchema), async (req, res) => {
    const body = req.body as z.infer<typeof createListingSchema>;
    const input: CreateListingInput = {
      sellerId: requireUserId(req),
      title: body.title,
      description: body.description,
      categoryId: body.categoryId,
      condition: body.condition,
      listingType: body.listingType,
      pricePence: body.pricePence ?? null,
      location: body.location,
      ...(body.deadlineAt !== undefined && { deadlineAt: body.deadlineAt }),
      ...(body.attributes !== undefined && { attributes: body.attributes }),
      ...(body.publish !== undefined && { publish: body.publish }),
    };
    res.status(201).json(await createListing(input));
  });

  router.get('/listings', optional, async (req, res) => {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Invalid query');
    }
    const q = parsed.data;
    res.status(200).json(
      await searchListings({
        ...(q.categoryId !== undefined && { categoryId: q.categoryId }),
        ...(q.sellerId !== undefined && { sellerId: q.sellerId }),
        ...(q.listingType !== undefined && { listingType: q.listingType }),
        ...(q.minPricePence !== undefined && { minPricePence: q.minPricePence }),
        ...(q.maxPricePence !== undefined && { maxPricePence: q.maxPricePence }),
        ...(q.keyword !== undefined && { keyword: q.keyword }),
        ...(q.lat !== undefined &&
          q.lng !== undefined && { center: { lat: q.lat, lng: q.lng } }),
        ...(q.radiusKm !== undefined && { radiusKm: q.radiusKm }),
        sort: q.sort,
        limit: q.limit,
        offset: q.offset,
      }),
    );
  });

  // A user's own saved listings (scoped to the caller — not a public filter).
  router.get('/favourites', auth, async (req, res) => {
    res.status(200).json(
      await searchListings({
        favouritedByUserId: requireUserId(req),
        sort: 'recent',
        limit: 100,
        offset: 0,
      }),
    );
  });

  router.get('/listings/:id', optional, async (req, res) => {
    const id = uuidParam(req, 'id');
    const source = (req.query.source as ViewSource | undefined) ?? 'direct';
    res.status(200).json(await viewListing(id, req.user?.id ?? null, source));
  });

  router.patch(
    '/listings/:id',
    auth,
    validateBody(updateListingSchema),
    async (req, res) => {
      const id = uuidParam(req, 'id');
      const body = req.body as UpdateListingInput;
      res.status(200).json(await updateListing(id, requireUserId(req), body));
    },
  );

  router.delete('/listings/:id', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    await removeListing(id, requireUserId(req));
    res.status(204).end();
  });

  router.post(
    '/listings/:id/photos',
    auth,
    validateBody(photoSchema),
    async (req, res) => {
      const id = uuidParam(req, 'id');
      const body = req.body as z.infer<typeof photoSchema>;
      res
        .status(201)
        .json(await createPhotoUpload(storage, id, requireUserId(req), body));
    },
  );

  router.post('/listings/:id/photos/:photoId/confirm', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    const photoId = uuidParam(req, 'photoId');
    res.status(200).json(await confirmPhoto(storage, id, photoId, requireUserId(req)));
  });

  router.post('/listings/:id/favourite', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    await favouriteListing(requireUserId(req), id);
    res.status(204).end();
  });

  router.delete('/listings/:id/favourite', auth, async (req, res) => {
    const id = uuidParam(req, 'id');
    await unfavouriteListing(requireUserId(req), id);
    res.status(204).end();
  });

  return router;
}
