import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import * as repo from './s3Object.repository.js';
import {
  ALLOWED_UPLOAD_TYPES,
  CONTENT_TYPE_EXTENSION,
  MAX_UPLOAD_BYTES,
  UPLOAD_PURPOSES,
  UPLOAD_URL_TTL_SECONDS,
  type CreateUploadInput,
  type CreateUploadResult,
  type StorageClient,
} from './storage.types.js';

export class StorageService {
  constructor(
    private readonly client: StorageClient,
    private readonly bucket: string,
    private readonly db: PrismaClient = getDb(),
  ) {}

  // Issues a presigned upload URL and records a pending s3Object. The object
  // stays pending until confirmUpload runs (called by the owning module once
  // the client reports the PUT succeeded; a lifecycle sweep orphans the rest).
  async createUpload(input: CreateUploadInput): Promise<CreateUploadResult> {
    if (!ALLOWED_UPLOAD_TYPES.includes(input.contentType)) {
      throw new BadRequestError(`Unsupported content type: ${input.contentType}`);
    }
    if (!UPLOAD_PURPOSES.includes(input.purpose)) {
      throw new BadRequestError(`Unsupported upload purpose: ${input.purpose}`);
    }
    if (input.sizeBytes <= 0 || input.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new BadRequestError(`Size must be between 1 and ${MAX_UPLOAD_BYTES} bytes`);
    }

    const extension = CONTENT_TYPE_EXTENSION[input.contentType];
    const key = `${input.purpose}/${input.ownerUserId}/${randomUUID()}.${extension}`;

    const object = await repo.insertPending(this.db, {
      bucket: this.bucket,
      key,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      ownerUserId: input.ownerUserId,
    });

    const { uploadUrl, method, fields } = await this.client.createPresignedUpload({
      bucket: this.bucket,
      key,
      contentType: input.contentType,
      maxSizeBytes: MAX_UPLOAD_BYTES,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    });

    return {
      s3ObjectId: object.id,
      bucket: this.bucket,
      key,
      uploadUrl,
      // Only present for form-post providers; a plain PUT ticket omits both.
      ...(method && { method }),
      ...(fields && { fields }),
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    };
  }

  // Marks an uploaded object confirmed. Ownership is enforced so a user can
  // only confirm their own pending uploads.
  async confirmUpload(s3ObjectId: string, ownerUserId: string): Promise<void> {
    const object = await repo.findById(this.db, s3ObjectId);
    if (!object) {
      throw new NotFoundError('Upload not found');
    }
    if (object.ownerUserId !== ownerUserId) {
      throw new ForbiddenError('Not your upload');
    }
    if (object.lifecycleStatus === 'confirmed') {
      return;
    }
    await repo.markConfirmed(this.db, s3ObjectId);
  }
}
