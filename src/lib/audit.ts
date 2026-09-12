import { prisma } from './db';
import type { SessionUser } from './auth';

export async function audit(
  user: SessionUser | null,
  action: string,
  entityType?: string,
  entityId?: string,
  oldValue?: unknown,
  newValue?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      userName: user?.name || user?.email || null,
      action,
      entityType,
      entityId,
      oldValue: oldValue === undefined ? undefined : (oldValue as object),
      newValue: newValue === undefined ? undefined : (newValue as object),
    },
  });
}