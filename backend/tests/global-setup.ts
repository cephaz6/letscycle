/**
 * Clears leftover test rows before the suite runs.
 *
 * The integration tests share one Postgres database. If any suite's teardown
 * fails part-way (an async handler writing a child row after the cleanup pass,
 * say), it leaves orphan users/listings behind — and those orphans then break
 * unrelated suites on the next run, so the failure never clears on its own.
 * Purging up front makes each run start from a known state, and keeps the dev
 * database free of test debris.
 *
 * Test accounts are always @example.com; real/demo accounts never are, so that
 * is the discriminator.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const TEST_EMAIL = '%@example.com';

// Child rows first, parents last — no cascades are declared on these FKs.
const PURGE_SQL = [
  `DELETE FROM review WHERE "reviewerUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)
     OR "revieweeUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "trustEvent" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "trustScore" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM flag WHERE "reporterUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "safeTransitSession" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "transactionEvent" WHERE "transactionId" IN (SELECT id FROM "transaction"
     WHERE "buyerId" IN (SELECT id FROM "user" WHERE email LIKE $1)
        OR "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM dispute WHERE "transactionId" IN (SELECT id FROM "transaction"
     WHERE "buyerId" IN (SELECT id FROM "user" WHERE email LIKE $1)
        OR "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM "transaction" WHERE "buyerId" IN (SELECT id FROM "user" WHERE email LIKE $1)
     OR "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "matchEvent" WHERE "listingId" IN (SELECT id FROM listing
     WHERE "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM "matchCandidate" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)
     OR "listingId" IN (SELECT id FROM listing WHERE "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM message WHERE "conversationId" IN (SELECT id FROM conversation
     WHERE "buyerId" IN (SELECT id FROM "user" WHERE email LIKE $1)
        OR "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM conversation WHERE "buyerId" IN (SELECT id FROM "user" WHERE email LIKE $1)
     OR "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "listingPhoto" WHERE "listingId" IN (SELECT id FROM listing
     WHERE "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM "listingView" WHERE "viewerUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)
     OR "listingId" IN (SELECT id FROM listing WHERE "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM favourite WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)
     OR "listingId" IN (SELECT id FROM listing WHERE "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1))`,
  `DELETE FROM "wishlistItem" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM notification WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "notificationPreference" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "pushSubscription" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "refreshToken" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "auditLog" WHERE "actorUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "s3Object" WHERE "ownerUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "termsAcceptance" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "userVerification" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "blockedUser" WHERE "blockerUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)
     OR "blockedUserId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "devAuthCredential" WHERE email LIKE $1`,
  `DELETE FROM listing WHERE "sellerId" IN (SELECT id FROM "user" WHERE email LIKE $1)`,
  `DELETE FROM "user" WHERE email LIKE $1`,
  // Categories the suites created: no listings left and not one of the seeded slugs.
  `DELETE FROM category WHERE NOT EXISTS (SELECT 1 FROM listing WHERE listing."categoryId" = category.id)
     AND slug NOT IN ('baby-kids','books-media','clothing','electronics','furniture','garden-diy',
                      'health-beauty','home-kitchen','other','pet-supplies','sports-outdoors','toys-games')`,
];

export async function setup(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch {
    // no .env — CI provides DATABASE_URL directly
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return; // DB suites are skipped anyway

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    for (const sql of PURGE_SQL) {
      // Only bind where the statement actually references the parameter.
      await (sql.includes('$1')
        ? prisma.$executeRawUnsafe(sql, TEST_EMAIL)
        : prisma.$executeRawUnsafe(sql));
    }
  } finally {
    await prisma.$disconnect();
  }
}
