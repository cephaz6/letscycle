import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express, { Router } from 'express';
import { getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import { MAX_UPLOAD_BYTES } from '../../services/system/index.js';

// Dev-only stand-in for S3 object storage, paired with the dummy presigner:
// the presigned URL points at PUT /dev-uploads, bytes land on local disk, and
// GET /media serves them back. Real S3 + CloudFront replace both endpoints
// behind the same StorageClient seam; this router is never mounted in
// production (server.ts gates it).

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Keys look like "listingPhoto/<userId>/<uuid>.jpg" — flatten to a safe
// filename so user input can never traverse the uploads directory.
function safeFilename(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function createDevMediaRouter(uploadsDir: string): Router {
  const router = Router();
  const ready = mkdir(uploadsDir, { recursive: true });

  // Presigned-upload target. Auth is the presigned key itself (mirrors S3,
  // where the signature authorizes the PUT): the key must match a pending
  // upload row and the content type must agree.
  router.put(
    '/dev-uploads',
    express.raw({ type: 'image/*', limit: MAX_UPLOAD_BYTES }),
    async (req, res) => {
      const key = String(req.query.key ?? '');
      if (!key) throw new BadRequestError('Missing key');

      const object = await getDb().s3Object.findUnique({ where: { key } });
      if (!object || object.lifecycleStatus !== 'pending') {
        throw new NotFoundError('No pending upload for this key');
      }
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        throw new BadRequestError('Empty body');
      }
      if (req.headers['content-type'] !== object.contentType) {
        throw new BadRequestError('Content type does not match the upload');
      }

      await ready;
      await writeFile(path.join(uploadsDir, safeFilename(key)), body);
      res.status(200).end();
    },
  );

  // Public read side (what <img src> hits). Keys are unguessable UUIDs.
  router.get('/media', async (req, res) => {
    const key = String(req.query.key ?? '');
    if (!key) throw new BadRequestError('Missing key');

    const contentType = CONTENT_TYPES[path.extname(key).toLowerCase()];
    if (!contentType) throw new NotFoundError('Unknown media type');

    try {
      const bytes = await readFile(path.join(uploadsDir, safeFilename(key)));
      res
        .status(200)
        .setHeader('Content-Type', contentType)
        .setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        // Public media is embedded by the web app on another origin; override
        // Helmet's default same-origin policy so <img> can load it.
        .setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
        .send(bytes);
    } catch {
      throw new NotFoundError('Media not found');
    }
  });

  return router;
}
