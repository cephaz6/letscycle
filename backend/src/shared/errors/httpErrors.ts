import { AppError, type AppErrorOptions } from './appError.js';

type HttpErrorOptions = Omit<AppErrorOptions, 'statusCode' | 'code'>;

function httpError(defaultMessage: string, code: string, statusCode: number) {
  return class extends AppError {
    constructor(message: string = defaultMessage, options: HttpErrorOptions = {}) {
      super(message, { ...options, code, statusCode });
    }
  };
}

export class BadRequestError extends httpError('Bad request', 'badRequest', 400) {}
export class UnauthorizedError extends httpError('Unauthorized', 'unauthorized', 401) {}
export class ForbiddenError extends httpError('Forbidden', 'forbidden', 403) {}
export class NotFoundError extends httpError('Not found', 'notFound', 404) {}
export class ConflictError extends httpError('Conflict', 'conflict', 409) {}
export class TooManyRequestsError extends httpError(
  'Too many requests',
  'tooManyRequests',
  429,
) {}
export class InternalServerError extends httpError(
  'Internal server error',
  'internalError',
  500,
) {}
