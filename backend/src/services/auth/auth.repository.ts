import type { PrismaClient } from '@prisma/client';
import type { RequestMeta } from './auth.types.js';

export interface RefreshTokenRow {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export async function insertRefreshToken(
  db: PrismaClient,
  input: { userId: string; tokenHash: string; expiresAt: Date } & RequestMeta,
): Promise<RefreshTokenRow> {
  return db.refreshToken.create({
    data: input,
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  });
}

export async function findByTokenHash(
  db: PrismaClient,
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  return db.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  });
}

export async function revokeById(db: PrismaClient, id: string): Promise<void> {
  await db.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

// Reuse of a revoked token is treated as theft: kill the whole session family.
export async function revokeAllForUser(db: PrismaClient, userId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
