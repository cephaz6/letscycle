import type { StorageClient } from './storage.types.js';

// S3 stand-in for dev and tests. When a publicOrigin is given (the running
// dev server), presigned URLs point at the local dev-uploads endpoint so
// browser PUTs actually store bytes (served back via GET /media). Without an
// origin (unit tests), a synthetic URL is returned. Real S3 replaces this
// behind the StorageClient interface. Never used in production.
export function createDummyStorage(publicOrigin?: string): StorageClient {
  return {
    createPresignedUpload({ bucket, key, expiresInSeconds }) {
      const url = publicOrigin
        ? `${publicOrigin}/api/v1/dev-uploads?key=${encodeURIComponent(key)}`
        : `https://${bucket}.s3.dummy.local/${key}` +
          `?X-Amz-Expires=${String(expiresInSeconds)}&X-Amz-Signature=dummy-signature`;
      return Promise.resolve({ uploadUrl: url });
    },
  };
}
