import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { BadRequestError } from '../../shared/errors/httpErrors.js';

export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      next(new BadRequestError(details));
      return;
    }
    req.body = result.data;
    next();
  };
}
