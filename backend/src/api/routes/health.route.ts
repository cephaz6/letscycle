import { Router } from 'express';

export interface HealthDeps {
  // Injected so unit tests run without a database.
  checkDbReady?: () => Promise<void>;
}

// Liveness always; readiness = DB ping when the app is wired to one.
export function createHealthRouter(deps: HealthDeps): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    void (async () => {
      if (!deps.checkDbReady) {
        res.status(200).json({ status: 'ok' });
        return;
      }
      try {
        await deps.checkDbReady();
        res.status(200).json({ status: 'ok', db: 'up' });
      } catch {
        res.status(503).json({ status: 'degraded', db: 'down' });
      }
    })();
  });

  return router;
}
