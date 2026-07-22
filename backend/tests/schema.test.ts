import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Verifies the applied migration matches the PRD data model.
// Requires a migrated database; skipped when DATABASE_URL is not set.
try {
  process.loadEnvFile();
} catch {
  // no .env — rely on the environment (CI sets DATABASE_URL directly)
}

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('database schema', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // devAuthCredential is excluded alongside the other non-model tables: it backs
  // the dummy Cognito stand-in in dev and goes away with real Cognito, so it is
  // not part of the PRD's 35-table data model.
  it('has exactly the 35 application tables', async () => {
    const rows = await prisma.$queryRaw<{ tableName: string }[]>`
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys', '_prisma_migrations', 'devAuthCredential')
      ORDER BY table_name
    `;
    expect(rows).toHaveLength(35);
  });

  it('has postgis enabled', async () => {
    const rows = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'postgis'
    `;
    expect(rows).toHaveLength(1);
  });

  it('generates searchText from listing title and description', async () => {
    const rows = await prisma.$queryRaw<{ isGenerated: string }[]>`
      SELECT is_generated AS "isGenerated"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'listing'
        AND column_name = 'searchText'
    `;
    expect(rows).toEqual([{ isGenerated: 'ALWAYS' }]);
  });

  it('has geospatial and full-text indexes', async () => {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'listing_location_idx',
          'listing_searchText_idx',
          'meetPoint_location_idx'
        )
      ORDER BY indexname
    `;
    expect(rows.map((r) => r.indexname)).toEqual([
      'listing_location_idx',
      'listing_searchText_idx',
      'meetPoint_location_idx',
    ]);
  });

  it('defaults primary keys to database-generated uuid v4', async () => {
    const rows = await prisma.$queryRaw<{ columnDefault: string | null }[]>`
      SELECT column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user'
        AND column_name = 'id'
    `;
    expect(rows[0]?.columnDefault).toBe('gen_random_uuid()');
  });
});
