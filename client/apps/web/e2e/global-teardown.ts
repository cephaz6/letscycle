import { execFileSync } from 'node:child_process';

/**
 * Purges everything the suite created, so repeated local runs don't pile up
 * accounts/listings in the dev database. Mirrors backend/tests/global-setup.ts:
 * same @example.com convention, same child-tables-before-parents order.
 *
 * Talks to the db container directly by name (as set up by backend's
 * docker-compose.yml) rather than via a Prisma/pg dependency in the web app —
 * this is test-only plumbing, not something the app itself needs.
 */
const DB_CONTAINER = 'backend-db-1';

const PURGE_SQL = `
do $$
begin
  delete from review where "reviewerUserId" in (select id from "user" where email like '%@example.com')
     or "revieweeUserId" in (select id from "user" where email like '%@example.com');
  delete from "trustEvent" where "userId" in (select id from "user" where email like '%@example.com');
  delete from "trustScore" where "userId" in (select id from "user" where email like '%@example.com');
  delete from flag where "reporterUserId" in (select id from "user" where email like '%@example.com');
  delete from "safeTransitSession" where "userId" in (select id from "user" where email like '%@example.com');
  delete from "transactionEvent" where "transactionId" in (select id from "transaction"
    where "buyerId" in (select id from "user" where email like '%@example.com')
       or "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from dispute where "transactionId" in (select id from "transaction"
    where "buyerId" in (select id from "user" where email like '%@example.com')
       or "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from "transaction" where "buyerId" in (select id from "user" where email like '%@example.com')
     or "sellerId" in (select id from "user" where email like '%@example.com');
  delete from "matchEvent" where "listingId" in (select id from listing
    where "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from "matchCandidate" where "userId" in (select id from "user" where email like '%@example.com')
     or "listingId" in (select id from listing where "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from message where "conversationId" in (select id from conversation
    where "buyerId" in (select id from "user" where email like '%@example.com')
       or "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from conversation where "buyerId" in (select id from "user" where email like '%@example.com')
     or "sellerId" in (select id from "user" where email like '%@example.com');
  delete from "listingPhoto" where "listingId" in (select id from listing
    where "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from "listingView" where "viewerUserId" in (select id from "user" where email like '%@example.com')
     or "listingId" in (select id from listing where "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from favourite where "userId" in (select id from "user" where email like '%@example.com')
     or "listingId" in (select id from listing where "sellerId" in (select id from "user" where email like '%@example.com'));
  delete from "wishlistItem" where "userId" in (select id from "user" where email like '%@example.com');
  delete from notification where "userId" in (select id from "user" where email like '%@example.com');
  delete from "notificationPreference" where "userId" in (select id from "user" where email like '%@example.com');
  delete from "pushSubscription" where "userId" in (select id from "user" where email like '%@example.com');
  delete from "refreshToken" where "userId" in (select id from "user" where email like '%@example.com');
  delete from "auditLog" where "actorUserId" in (select id from "user" where email like '%@example.com');
  delete from "devAuthCredential" where email like '%@example.com';
  delete from listing where "sellerId" in (select id from "user" where email like '%@example.com');
  delete from "user" where email like '%@example.com';
end $$;
`;

export default function globalTeardown(): void {
  try {
    execFileSync(
      'docker',
      ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'letscycle'],
      { input: PURGE_SQL, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    // eslint-disable-next-line no-console -- test-run diagnostics, not app code
    console.log('e2e: purged @example.com test data');
  } catch (error) {
    // A cleanup failure shouldn't fail the whole test run — just flag it.
    // eslint-disable-next-line no-console -- test-run diagnostics, not app code
    console.warn('e2e: cleanup failed, purge manually if needed:', error);
  }
}
