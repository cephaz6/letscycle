import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import { ConflictError, NotFoundError } from '../../shared/errors/httpErrors.js';
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
