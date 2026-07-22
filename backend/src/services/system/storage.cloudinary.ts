import { createHash } from 'node:crypto';
import type { PresignedUpload, StorageClient } from './storage.types.js';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Cloudinary-backed storage, used wherever the host has no persistent disk.
 *
 * The browser uploads straight to Cloudinary — bytes never pass through this
 * server — using a signature we mint here so the API secret stays server-side.
 * That is why this returns a form POST rather than the PUT the S3-style seam
 * defaults to: Cloudinary's upload endpoint takes multipart form data.
 */
export function createCloudinaryStorage(config: CloudinaryConfig): StorageClient {
  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

  return {
    createPresignedUpload({ key }): Promise<PresignedUpload> {
      // Cloudinary appends the format itself, so the public_id is the key
      // without its extension. Keeping the rest of the key verbatim means the
      // delivery URL stays predictable from what we already store on the row.
      const publicId = key.replace(/\.[^./]+$/, '');
      const timestamp = Math.floor(Date.now() / 1000);

      // Signature = SHA-1 of the signed params in alphabetical order, joined
      // as a query string, with the API secret appended. api_key and the file
      // are sent but never signed.
      const signedParams: Record<string, string> = {
        public_id: publicId,
        timestamp: String(timestamp),
      };
      const toSign = Object.keys(signedParams)
        .sort()
        .map((name) => `${name}=${signedParams[name] ?? ''}`)
        .join('&');
      const signature = createHash('sha1')
        .update(`${toSign}${config.apiSecret}`)
        .digest('hex');

      return Promise.resolve({
        uploadUrl: endpoint,
        method: 'POST',
        fields: { ...signedParams, api_key: config.apiKey, signature },
      });
    },
  };
}
