import pino from 'pino';
import { createApp } from './api/app.js';

// Minimal logger for startup; shared logging (redaction, correlation IDs)
// arrives in build step 3.
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  logger.info({ port }, 'server listening');
});
