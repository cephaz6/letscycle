import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/appError.js';
import { getLogger } from '../../shared/logging/logger.js';

// Operational errors surface their message; anything else is a masked 500.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  getLogger().error({ err }, 'unhandled error');
  res.status(500).json({
    error: { code: 'internalError', message: 'Internal server error' },
  });
}
