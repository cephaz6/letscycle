import type { PrismaClient } from '@prisma/client';
import type { ViewSource } from './listing.types.js';

export async function recordView(
  db: PrismaClient,
  input: { listingId: string; viewerUserId: string | null; source: ViewSource },
): Promise<void> {
  await db.listingView.create({ data: input });
}
