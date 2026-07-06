import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

function captureLogger() {
  const lines: string[] = [];
  const logger = createLogger(
    { level: 'info' },
    {
      write(msg: string) {
        lines.push(msg);
      },
    },
  );
  return { logger, lines };
}

describe('logger redaction', () => {
  it('redacts top-level PII fields', () => {
    const { logger, lines } = captureLogger();

    logger.info({ email: 'user@example.com', phone: '07700900000' }, 'signup');

    const entry = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(entry['email']).toBe('[redacted]');
    expect(entry['phone']).toBe('[redacted]');
    expect(entry['msg']).toBe('signup');
  });

  it('redacts PII nested one level deep', () => {
    const { logger, lines } = captureLogger();

    logger.info({ user: { email: 'user@example.com', displayName: 'Ceph' } }, 'x');

    const entry = JSON.parse(lines[0]!) as { user: Record<string, unknown> };
    expect(entry.user['email']).toBe('[redacted]');
    expect(entry.user['displayName']).toBe('[redacted]');
  });

  it('redacts authorization headers', () => {
    const { logger, lines } = captureLogger();

    logger.info({ req: { headers: { authorization: 'Bearer abc' } } }, 'x');

    const entry = JSON.parse(lines[0]!) as {
      req: { headers: Record<string, unknown> };
    };
    expect(entry.req.headers['authorization']).toBe('[redacted]');
  });

  it('leaves non-PII fields intact', () => {
    const { logger, lines } = captureLogger();

    logger.info({ listingId: 'abc-123', pricePence: 500 }, 'listed');

    const entry = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(entry['listingId']).toBe('abc-123');
    expect(entry['pricePence']).toBe(500);
  });
});
