import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import { ConflictError } from '../../shared/errors/httpErrors.js';
import * as repo from './user.repository.js';
import type { CreateUserInput, UserAccount } from './user.types.js';

// Minimal slice for the auth module (build step 4). The full users module
// (profiles, verification, blocks) lands in build step 5.

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
