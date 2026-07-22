import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import type { DummyAccountStore, StoredAccount } from './cognito.dummy.js';

/**
 * Database-backed credential store for the dummy Cognito (dev only).
 *
 * Passwords used to live in a JSON file on a docker volume, which could be
 * cleared or lost independently of the database — leaving a user row that could
 * neither sign in nor re-register. Keeping credentials in Postgres ties them to
 * the same lifecycle and backup as everything else.
 */
export function createDevCredentialStore(db: PrismaClient = getDb()): DummyAccountStore {
  return {
    async findByEmail(email: string): Promise<StoredAccount | null> {
      const row = await db.devAuthCredential.findUnique({
        where: { email },
        select: { passwordHash: true, cognitoSub: true },
      });
      return row ?? null;
    },

    async upsert(email: string, account: StoredAccount): Promise<void> {
      await db.devAuthCredential.upsert({
        where: { email },
        create: { email, ...account },
        update: { passwordHash: account.passwordHash, cognitoSub: account.cognitoSub },
      });
    },
  };
}
