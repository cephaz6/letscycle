import { Prisma, type PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type {
  CreateUserInput,
  MyProfile,
  PublicProfile,
  UpdateProfileInput,
  UserAccount,
} from './user.types.js';

type Db = PrismaClient | Tx;

const accountSelect = {
  id: true,
  email: true,
  displayName: true,
  cognitoSub: true,
  accountStatus: true,
} as const;

export async function insertUser(tx: Tx, input: CreateUserInput): Promise<UserAccount> {
  return tx.user.create({ data: input, select: accountSelect });
}

export async function findById(db: Db, id: string): Promise<UserAccount | null> {
  return db.user.findUnique({ where: { id }, select: accountSelect });
}

export async function findByCognitoSub(
  db: Db,
  cognitoSub: string,
): Promise<UserAccount | null> {
  return db.user.findUnique({ where: { cognitoSub }, select: accountSelect });
}

export async function findByEmail(db: Db, email: string): Promise<UserAccount | null> {
  return db.user.findUnique({ where: { email }, select: accountSelect });
}

// GDPR erasure: overwrite personal data and mark the account deleted. Keeps
// the row (foreign keys from transactions/reviews the counterparty still needs)
// but strips all PII. email/cognitoSub are set to unique tombstones.
export async function anonymise(tx: Tx, id: string): Promise<void> {
  await tx.user.update({
    where: { id },
    data: {
      email: `deleted-${id}@deleted.invalid`,
      cognitoSub: `deleted-${id}`,
      phone: null,
      displayName: 'Deleted user',
      avatarUrl: null,
      bio: null,
      homeLocationAccuracyMetres: null,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      preferences: {},
      accountStatus: 'deleted',
    },
  });
  await tx.$executeRaw`UPDATE "user" SET "homeLocation" = NULL WHERE id = ${id}::uuid`;
}

// Shape returned by the raw profile query. homeLocation is geography and can't
// be selected via Prisma, so lat/lng are extracted with PostGIS accessors.
interface ProfileRow {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  homeLat: number | null;
  homeLng: number | null;
  homeLocationAccuracyMetres: number | null;
  accountStatus: 'active' | 'suspended' | 'deleted';
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  preferences: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toMyProfile(row: ProfileRow): MyProfile {
  const hasLocation =
    row.homeLat !== null &&
    row.homeLng !== null &&
    row.homeLocationAccuracyMetres !== null;
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    homeLocation: hasLocation
      ? {
          lat: row.homeLat as number,
          lng: row.homeLng as number,
          accuracyMetres: row.homeLocationAccuracyMetres as number,
        }
      : null,
    accountStatus: row.accountStatus,
    emailVerifiedAt: row.emailVerifiedAt,
    phoneVerifiedAt: row.phoneVerifiedAt,
    preferences: (row.preferences as MyProfile['preferences']) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getMyProfile(db: Db, id: string): Promise<MyProfile | null> {
  const rows = await db.$queryRaw<ProfileRow[]>`
    SELECT
      id, email, phone, "displayName", "avatarUrl", bio,
      ST_Y("homeLocation"::geometry) AS "homeLat",
      ST_X("homeLocation"::geometry) AS "homeLng",
      "homeLocationAccuracyMetres",
      "accountStatus", "emailVerifiedAt", "phoneVerifiedAt",
      preferences, "createdAt", "updatedAt"
    FROM "user"
    WHERE id = ${id}::uuid
  `;
  const row = rows[0];
  return row ? toMyProfile(row) : null;
}

export async function getPublicProfile(
  db: Db,
  id: string,
): Promise<PublicProfile | null> {
  const user = await db.user.findFirst({
    where: { id, accountStatus: 'active' },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  // Headline stats. These read other modules' tables directly (listing,
  // transaction, review) rather than importing each module — the same
  // extractable-module read pattern used elsewhere for cross-module counts.
  const [listingsCount, salesCount, reviewsCount, ratingAgg] = await Promise.all([
    db.listing.count({ where: { sellerId: id, status: 'active' } }),
    db.transaction.count({ where: { sellerId: id, status: 'completed' } }),
    db.review.count({ where: { revieweeUserId: id } }),
    db.review.aggregate({ where: { revieweeUserId: id }, _avg: { rating: true } }),
  ]);

  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isEmailVerified: user.emailVerifiedAt !== null,
    memberSince: user.createdAt,
    stats: {
      listingsCount,
      salesCount,
      reviewsCount,
      averageRating: ratingAgg._avg.rating,
    },
  };
}

// Applies a partial update. Scalar fields go through Prisma; the geography
// column is set with raw PostGIS. Caller must run this inside a transaction.
export async function updateProfile(
  tx: Tx,
  id: string,
  input: UpdateProfileInput,
): Promise<void> {
  const data: Prisma.UserUpdateInput = {};
  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.preferences !== undefined) {
    data.preferences = input.preferences as Prisma.InputJsonValue;
  }

  if ('homeLocation' in input) {
    if (input.homeLocation === null) {
      data.homeLocationAccuracyMetres = null;
    } else if (input.homeLocation) {
      data.homeLocationAccuracyMetres = input.homeLocation.accuracyMetres;
    }
  }

  if (Object.keys(data).length > 0) {
    await tx.user.update({ where: { id }, data });
  }

  if ('homeLocation' in input) {
    const loc = input.homeLocation;
    if (loc === null) {
      await tx.$executeRaw`UPDATE "user" SET "homeLocation" = NULL WHERE id = ${id}::uuid`;
    } else if (loc) {
      await tx.$executeRaw`
        UPDATE "user"
        SET "homeLocation" = ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)::geography
        WHERE id = ${id}::uuid
      `;
    }
  }
}
