import type { StorageClient } from './storage.types.js';

// In-memory S3 stand-in for dev and tests: returns a synthetic but
// well-formed presigned URL. No bytes are stored. Real S3 replaces this
// behind the StorageClient interface. Never used in production.
export function createDummyStorage(): StorageClient {
  return {
    createPresignedUpload({ bucket, key, expiresInSeconds }) {
      const url =
        `https://${bucket}.s3.dummy.local/${key}` +
        `?X-Amz-Expires=${String(expiresInSeconds)}&X-Amz-Signature=dummy-signature`;
      return Promise.resolve({ uploadUrl: url });
    },
  };
}
