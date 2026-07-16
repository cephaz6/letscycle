import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import { ConflictError, NotFoundError } from '../../shared/errors/httpErrors.js';
import { revokeAllSessions } from '../auth/index.js';
import { revokeAllPushSubscriptions } from '../notifications/index.js';
import { listSellerListings, removeSellerListings } from '../listings/index.js';
import { listMyWishlist } from '../wishlists/index.js';
import { listUserTransactions } from '../transactions/index.js';
import { listUserReviews } from '../trust/index.js';
import * as repo from './user.repository.js';
import type {
  CreateUserInput,
  MyProfile,
  PublicProfile,
  UpdateProfileInput,
  UserAccount,
} from './user.types.js';

export async function createUser(
  input: CreateUserInput,
  db: PrismaClient = getDb(),
): Promise<UserAccount> {
  const existing = await repo.findByEmail(db, input.email);
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  return withTransaction(async (tx) => {
    const user = await repo.insertUser(tx, input);
    await publishEvent(tx, {
      eventType: 'user.created',
      aggregateType: 'user',
      aggregateId: user.id,
      payload: { userId: user.id },
    });
    return user;
  }, db);
}

export async function getUserById(
  id: string,
  db: PrismaClient = getDb(),
): Promise<UserAccount | null> {
  return repo.findById(db, id);
}

export async function getUserByCognitoSub(
  cognitoSub: string,
  db: PrismaClient = getDb(),
): Promise<UserAccount | null> {
  return repo.findByCognitoSub(db, cognitoSub);
}

export async function getUserByEmail(
  email: string,
  db: PrismaClient = getDb(),
): Promise<UserAccount | null> {
  return repo.findByEmail(db, email);
}

export async function getMyProfile(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<MyProfile> {
  const profile = await repo.getMyProfile(db, userId);
  if (!profile) {
    throw new NotFoundError('User not found');
  }
  return profile;
}

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileInput,
  db: PrismaClient = getDb(),
): Promise<MyProfile> {
  return withTransaction(async (tx) => {
    const existing = await repo.getMyProfile(tx, userId);
    if (!existing) {
      throw new NotFoundError('User not found');
    }
    await repo.updateProfile(tx, userId, input);
    // Re-read inside the transaction so the response reflects the new state,
    // including the geography column that Prisma can't return directly.
    const updated = await repo.getMyProfile(tx, userId);
    if (!updated) {
      throw new NotFoundError('User not found');
    }
    return updated;
  }, db);
}

export async function getPublicProfile(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<PublicProfile> {
  const profile = await repo.getPublicProfile(db, userId);
  if (!profile) {
    throw new NotFoundError('User not found');
  }
  return profile;
}

// --- GDPR: erasure and portability ---

// Right to erasure: anonymise the account, withdraw the user's content, and
// revoke all access. Rows other parties depend on (transactions, reviews)
// remain but carry no PII. A hard purge is deferred to an ops retention job.
export async function deleteMyAccount(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  const existing = await repo.findById(db, userId);
  if (!existing) {
    throw new NotFoundError('User not found');
  }
  if (existing.accountStatus === 'deleted') {
    return; // idempotent
  }

  await removeSellerListings(userId, db);
  await revokeAllSessions(userId, db);
  await revokeAllPushSubscriptions(userId, db);
  await withTransaction((tx) => repo.anonymise(tx, userId), db);
}

export interface DataExport {
  exportedAt: string;
  profile: MyProfile;
  listings: unknown[];
  wishlists: unknown[];
  transactions: unknown[];
  reviews: { given: unknown[]; received: unknown[] };
}

// Right to data portability: the user's own data as a JSON bundle.
export async function exportMyData(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<DataExport> {
  const [profile, listings, wishlists, transactions, reviews] = await Promise.all([
    getMyProfile(userId, db),
    listSellerListings(userId, db),
    listMyWishlist(userId, db),
    listUserTransactions(userId, db),
    listUserReviews(userId, db),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    listings,
    wishlists,
    transactions,
    reviews,
  };
}
