import { Prisma, type PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import type { Tx } from '../../shared/db/transaction.js';

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
}

// Append-only security/compliance audit trail (system module owns auditLog).
// Best-effort: auditing must never break the audited action.
export async function recordAudit(
  input: AuditInput,
  db: PrismaClient | Tx = getDb(),
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      ipAddress: input.ipAddress ?? 'unknown',
      userAgent: input.userAgent ?? 'unknown',
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}
