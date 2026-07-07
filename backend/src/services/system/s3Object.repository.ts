import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';

type Db = PrismaClient | Tx;

export interface S3ObjectRow {
  id: string;
  ownerUserId: string | null;
  lifecycleStatus: 'pending' | 'confirmed' | 'orphaned' | 'deleted';
}

export async function insertPending(
  db: Db,
  input: {
    bucket: string;
    key: string;
    contentType: string;
    sizeBytes: number;
    ownerUserId: string;
  },
): Promise<{ id: string }> {
  return db.s3Object.create({
    data: { ...input, lifecycleStatus: 'pending' },
    select: { id: true },
  });
}

export async function findById(db: Db, id: string): Promise<S3ObjectRow | null> {
  return db.s3Object.findUnique({
    where: { id },
    select: { id: true, ownerUserId: true, lifecycleStatus: true },
  });
}

export async function markConfirmed(db: Db, id: string): Promise<void> {
  await db.s3Object.update({
    where: { id },
    data: { lifecycleStatus: 'confirmed' },
  });
}
