import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCloudinaryStorage } from './storage.cloudinary.js';

const config = { cloudName: 'demo-cloud', apiKey: '123456789', apiSecret: 'SECRET' };

async function ticketFor(key: string) {
  return createCloudinaryStorage(config).createPresignedUpload({
    bucket: 'ignored',
    key,
    contentType: 'image/jpeg',
    maxSizeBytes: 5_000_000,
    expiresInSeconds: 900,
  });
}

describe('cloudinary storage', () => {
  it('issues a form POST against the account upload endpoint', async () => {
    const ticket = await ticketFor('listingPhoto/user-1/abc.jpg');

    expect(ticket.uploadUrl).toBe(
      'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
    );
    // The seam defaults to PUT; Cloudinary must opt into multipart.
    expect(ticket.method).toBe('POST');
  });

  it('drops the extension from public_id so the delivery URL is predictable', async () => {
    const ticket = await ticketFor('listingPhoto/user-1/abc.jpg');

    // Cloudinary appends the format itself — keeping ".jpg" would yield
    // ".jpg.jpg" and break every image URL the client builds from the key.
    expect(ticket.fields?.public_id).toBe('listingPhoto/user-1/abc');
  });

  it('signs the request the way Cloudinary will verify it', async () => {
    const ticket = await ticketFor('avatar/user-1/xyz.png');
    const fields = ticket.fields ?? {};

    const expected = createHash('sha1')
      .update(
        `public_id=${fields.public_id}&timestamp=${fields.timestamp}${config.apiSecret}`,
      )
      .digest('hex');

    expect(fields.signature).toBe(expected);
    expect(fields.api_key).toBe(config.apiKey);
  });

  it('never puts the api secret in the browser-bound fields', async () => {
    const ticket = await ticketFor('avatar/user-1/xyz.png');

    // These fields are handed to the browser verbatim.
    expect(JSON.stringify(ticket)).not.toContain(config.apiSecret);
  });
});
