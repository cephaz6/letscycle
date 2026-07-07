import type { PrismaClient } from '@prisma/client';
import type { Tx } from '../../shared/db/transaction.js';

type Db = PrismaClient | Tx;

export interface CategorySeed {
  slug: string;
  name: string;
  typicalDistanceKm: number;
  iconName: string;
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  typicalDistanceKm: number;
  iconName: string;
}

const categorySelect = {
  id: true,
  slug: true,
  name: true,
  parentId: true,
  typicalDistanceKm: true,
  iconName: true,
} as const;

// Idempotent upsert by slug — safe to run on every deploy.
export async function upsertCategories(db: Db, seeds: CategorySeed[]): Promise<void> {
  for (const seed of seeds) {
    await db.category.upsert({
      where: { slug: seed.slug },
      create: seed,
      update: {
        name: seed.name,
        typicalDistanceKm: seed.typicalDistanceKm,
        iconName: seed.iconName,
      },
    });
  }
}

export async function findAll(db: Db): Promise<CategoryRow[]> {
  return db.category.findMany({ select: categorySelect, orderBy: { name: 'asc' } });
}

export async function findById(db: Db, id: string): Promise<CategoryRow | null> {
  return db.category.findUnique({ where: { id }, select: categorySelect });
}
