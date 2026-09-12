import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { AuditLogView } from '@/components/admin/audit-log-view';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage({ searchParams }: { searchParams: { entity?: string; action?: string } }) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const where = {
    ...(searchParams.entity ? { entityType: searchParams.entity } : {}),
    ...(searchParams.action ? { action: searchParams.action } : {}),
  };

  const [logs, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.auditLog.findMany({ select: { entityType: true }, distinct: ['entityType'] }),
  ]);

  const actions = [...new Set(logs.map((l) => l.action))].sort();

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Audit Log</h1>
        <p className="mt-1 text-sm text-inkSoft">A complete history of important changes — nothing is silently overwritten.</p>
      </div>
      <AuditLogView
        logs={logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), oldValue: l.oldValue, newValue: l.newValue }))}
        entityTypes={entityTypes.map((e) => e.entityType).filter(Boolean) as string[]}
        actions={actions}
      />
      <p className="mt-4 text-xs text-inkSoft">Showing the latest {logs.length} entries · older entries remain in the database.</p>
    </div>
  );
}