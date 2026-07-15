import { disconnectDb, getDb } from './shared/db/client.js';
import { getLogger } from './shared/logging/logger.js';
import { seedDefaultSiteSettings } from './services/system/index.js';
import { seedCategories } from './services/listings/index.js';
import { seedMeetPoints } from './services/safety/index.js';

// Idempotent seed entrypoint (`npm run seed`). Each module contributes its own seed.
async function seed(): Promise<void> {
  const log = getLogger();
  const db = getDb();

  const settingsCount = await seedDefaultSiteSettings(db);
  log.info({ settingsCount }, 'seeded site settings');

  const categoryCount = await seedCategories(db);
  log.info({ categoryCount }, 'seeded categories');

  const meetPointCount = await seedMeetPoints(db);
  log.info({ meetPointCount }, 'seeded meet points');

  log.info('seed complete');
}

seed()
  .catch((error: unknown) => {
    getLogger().error({ err: error }, 'seed failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDb();
  });
