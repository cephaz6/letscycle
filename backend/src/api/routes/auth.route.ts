import { Router, type Request } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import type { AuthService, RequestMeta } from '../../services/auth/index.js';

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(256),
  displayName: z.string().trim().min(1).max(80),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const googleSchema = z.object({
  credential: z.string().min(1),
});

function requestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers['user-agent'] ?? 'unknown',
    ipAddress: req.ip ?? 'unknown',
  };
}

export function createAuthRouter(auth: AuthService): Router {
  const router = Router();

  router.post('/auth/signup', validateBody(signupSchema), async (req, res) => {
    const result = await auth.signup(req.body as z.infer<typeof signupSchema>);
    res.status(201).json(result);
  });

  router.post('/auth/login', validateBody(loginSchema), async (req, res) => {
    const session = await auth.login(
      req.body as z.infer<typeof loginSchema>,
      requestMeta(req),
    );
    res.status(200).json(session);
  });

  router.post('/auth/google', validateBody(googleSchema), async (req, res) => {
    const { credential } = req.body as z.infer<typeof googleSchema>;
    const session = await auth.loginWithGoogle(credential, requestMeta(req));
    res.status(200).json(session);
  });

  router.post('/auth/refresh', validateBody(refreshSchema), async (req, res) => {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
    const session = await auth.refresh(refreshToken, requestMeta(req));
    res.status(200).json(session);
  });

  router.post('/auth/logout', validateBody(refreshSchema), async (req, res) => {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
    await auth.logout(refreshToken);
    res.status(204).end();
  });

  return router;
}
