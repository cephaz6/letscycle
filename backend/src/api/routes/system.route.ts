import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { TokenVerifier } from '../../services/auth/index.js';
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_PURPOSES,
  acceptCurrentTerms,
  getCurrentTermsVersion,
  getPublicSettings,
  type StorageService,
} from '../../services/system/index.js';

export interface SystemRouterDeps {
  storageService?: StorageService;
  tokenVerifier?: TokenVerifier;
}

const uploadSchema = z
  .object({
    purpose: z.enum(UPLOAD_PURPOSES),
    contentType: z.enum(ALLOWED_UPLOAD_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  })
  .strict();

export function createSystemRouter(deps: SystemRouterDeps): Router {
  const router = Router();

  // Public — no auth required.
  router.get('/site-settings/public', async (_req, res) => {
    res.status(200).json(await getPublicSettings());
  });

  router.get('/terms/current', (_req, res) => {
    res.status(200).json({ version: getCurrentTermsVersion() });
  });

  if (deps.tokenVerifier) {
    const auth = requireAuth(deps.tokenVerifier);

    router.post('/terms/acceptances', auth, async (req, res) => {
      if (!req.user) throw new UnauthorizedError();
      res.status(201).json(await acceptCurrentTerms(req.user.id));
    });

    if (deps.storageService) {
      const storage = deps.storageService;
      router.post('/uploads', auth, validateBody(uploadSchema), async (req, res) => {
        if (!req.user) throw new UnauthorizedError();
        const body = req.body as z.infer<typeof uploadSchema>;
        const result = await storage.createUpload({
          ownerUserId: req.user.id,
          purpose: body.purpose,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
        });
        res.status(201).json(result);
      });
    }
  }

  return router;
}
