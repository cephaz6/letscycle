// Upload constraints. Kept as module constants (single source of truth) and
// also mirrored into public site settings so the frontend can read them.
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const UPLOAD_PURPOSES = ['listingPhoto', 'avatar'] as const;

export type UploadContentType = (typeof ALLOWED_UPLOAD_TYPES)[number];
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const CONTENT_TYPE_EXTENSION: Record<UploadContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface PresignedUpload {
  uploadUrl: string;
}

// Seam for AWS S3 presigning. The dummy serves dev and tests; the real
// implementation (@aws-sdk/client-s3 + s3-request-presigner, presigned POST
// with a content-length-range condition) plugs in unchanged with the CDK
// infrastructure. Never used in production until then.
export interface StorageClient {
  createPresignedUpload(input: {
    bucket: string;
    key: string;
    contentType: string;
    maxSizeBytes: number;
    expiresInSeconds: number;
  }): Promise<PresignedUpload>;
}

export interface CreateUploadInput {
  ownerUserId: string;
  purpose: UploadPurpose;
  contentType: UploadContentType;
  sizeBytes: number;
}

export interface CreateUploadResult {
  s3ObjectId: string;
  bucket: string;
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
}
