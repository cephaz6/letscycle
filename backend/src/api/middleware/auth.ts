import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors/httpErrors.js';
import { getUserByCognitoSub } from '../../services/users/index.js';
import type { TokenVerifier } from '../../services/auth/index.js';

export interface AuthenticatedUser {
  id: string;
  cognitoSub: string;
  roles: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(verifier: TokenVerifier): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new UnauthorizedError('Missing bearer token'));
      return;
    }

    let claims;
    try {
      claims = await verifier.verify(header.slice('Bearer '.length));
    } catch {
      next(new UnauthorizedError('Invalid or expired token'));
      return;
    }

    const user = await getUserByCognitoSub(claims.cognitoSub);
    if (!user || user.accountStatus !== 'active') {
      next(new UnauthorizedError('Account is not active'));
      return;
    }

    req.user = { id: user.id, cognitoSub: user.cognitoSub, roles: claims.roles };
    next();
  };
}
