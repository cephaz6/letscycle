import express from 'express';
import { healthRouter } from './routes/health.route.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/v1', healthRouter);

  return app;
}
