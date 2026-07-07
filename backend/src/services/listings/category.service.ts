import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { BadRequestError } from '../../shared/errors/httpErrors.js';
import * as repo from './category.repository.js';
import { CATEGORY_SEED } from './category.data.js';
import type { CategoryRow } from './category.repository.js';

export async function seedCategories(db: PrismaClient = getDb()): Promise<number> {
  await repo.upsertCategories(db, CATEGORY_SEED);
  return CATEGORY_SEED.length;
}

export async function listCategories(db: PrismaClient = getDb()): Promise<CategoryRow[]> {
  return repo.findAll(db);
}

// Guards listing writes against unknown categories (FK would 500 otherwise).
export async function assertCategoryExists(
  categoryId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  const category = await repo.findById(db, categoryId);
  if (!category) {
    throw new BadRequestError(`Unknown category: ${categoryId}`);
  }
}
