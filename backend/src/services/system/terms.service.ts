import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import * as repo from './terms.repository.js';
import { CURRENT_TERMS_VERSION } from './terms.content.js';

export function getCurrentTermsVersion(): string {
  return CURRENT_TERMS_VERSION;
}

export async function acceptCurrentTerms(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<{ termsVersion: string }> {
  await repo.insertAcceptance(db, { userId, termsVersion: CURRENT_TERMS_VERSION });
  return { termsVersion: CURRENT_TERMS_VERSION };
}

export async function hasAcceptedCurrentTerms(
  userId: string,
  db: PrismaClient = getDb(),
): Promise<boolean> {
  return repo.hasAccepted(db, userId, CURRENT_TERMS_VERSION);
}
