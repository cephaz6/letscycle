import { describe, expect, it } from 'vitest';
import { AppError } from './appError.js';
import { ForbiddenError, NotFoundError } from './httpErrors.js';

describe('AppError', () => {
  it('defaults to an operational 500', () => {
    const err = new AppError('boom');

    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('internalError');
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe('AppError');
  });

  it('preserves the cause chain', () => {
    const root = new Error('root');
    const err = new AppError('wrapped', { cause: root });

    expect(err.cause).toBe(root);
  });
});

describe('http errors', () => {
  it('carries the right status code and code', () => {
    const err = new ForbiddenError();

    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('forbidden');
    expect(err.message).toBe('Forbidden');
    expect(err.name).toBe('ForbiddenError');
  });

  it('accepts a custom message', () => {
    const err = new NotFoundError('Listing not found');

    expect(err.message).toBe('Listing not found');
    expect(err.statusCode).toBe(404);
  });

  it('is an instanceof AppError and Error', () => {
    const err = new NotFoundError();

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});
