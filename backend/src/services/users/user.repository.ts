import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';
import type { CreateUserInput, UserAccount } from './user.types.js';

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

export async function findById(
  db: PrismaClient | Tx,
  id: string,
): Promise<UserAccount | null> {
  return db.user.findUnique({ where: { id }, select: accountSelect });
}

export async function findByCognitoSub(
  db: PrismaClient | Tx,
  cognitoSub: string,
): Promise<UserAccount | null> {
  return db.user.findUnique({ where: { cognitoSub }, select: accountSelect });
}

export async function findByEmail(
  db: PrismaClient | Tx,
  email: string,
): Promise<UserAccount | null> {
  return db.user.findUnique({ where: { email }, select: accountSelect });
}
