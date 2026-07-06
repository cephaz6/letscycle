import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('applies defaults when vars are absent', () => {
    const env = parseEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces PORT to a number', () => {
    expect(parseEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects invalid values with a readable message', () => {
    expect(() => parseEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ DATABASE_URL: 'not-a-url' })).toThrow(/DATABASE_URL/);
  });

  it('accepts a full production-shaped environment', () => {
    const env = parseEnv({
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      AWS_REGION: 'eu-west-2',
      SES_FROM_EMAIL: 'noreply@letscycle.example',
    });

    expect(env.NODE_ENV).toBe('production');
    expect(env.DATABASE_URL).toContain('postgresql://');
  });
});
