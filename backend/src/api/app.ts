import express from 'express';
import { createHealthRouter, type HealthDeps } from './routes/health.route.js';

export type AppDeps = HealthDeps;

export function createApp(deps: AppDeps = {}): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/v1', createHealthRouter(deps));

  return app;
}
