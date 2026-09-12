import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/icons';
import { StatCard } from '@/components/dashboard';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const [pendingRequests, pendingPhotos, memberCount, userCount, pendingUsers, totalPhotos, recentLogs] = await Promise.all([
    prisma.changeRequest.count({ where: { status: 'PENDING' } }),
    prisma.photo.count({ where: { approvalStatus: 'PENDING', deletedAt: null } }),
    prisma.familyMember.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.photo.count({ where: { approvalStatus: 'APPROVED', deletedAt: null } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);

  const pendingTotal = pendingRequests + pendingPhotos;

  const quickActions = [
    { href: '/admin/users', title: 'Manage Users', desc: `${userCount} accounts · ${pendingUsers} pending`, icon: 'userPlus' },
    { href: '/admin/settings', title: 'Site Settings', desc: 'Approvals, privacy, registration', icon: 'filter' },
    { href: '/admin/settings', title: 'Backup & Export', desc: 'GEDCOM export & data backup', icon: 'download' },
  ];

  const sections = [
    { href: '/admin/approvals', title: 'Pending Approvals', desc: `${pendingRequests} change request${pendingRequests === 1 ? '' : 's'} · ${pendingPhotos} photo${pendingPhotos === 1 ? '' : 's'}`, icon: 'shield', urgent: pendingTotal > 0 },
    { href: '/admin/members', title: 'Family Management', desc: `${memberCount} members · relationships · branches`, icon: 'users' },
    { href: '/admin/photos', title: 'Photo Review', desc: `${pendingPhotos} photo${pendingPhotos === 1 ? '' : 's'} awaiting review`, icon: 'photo' },
    { href: '/admin/audit', title: 'Audit Log', desc: 'Complete history of important changes', icon: 'clock' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-inkSoft">Manage the family archive.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Approvals"
          value={pendingTotal}
          href="/admin/approvals"
          icon="shield"
          iconBg={pendingTotal > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}
          trend={pendingTotal > 0 ? 'Action needed' : 'All caught up'}
          trendColor={pendingTotal > 0 ? 'text-orange-600' : 'text-green-600'}
        />
        <StatCard
          label="Family Members"
          value={memberCount}
          href="/admin/members"
          icon="users"
          iconBg="bg-navyAccent/10 text-navyAccent"
        />
        <StatCard
          label="Total Photos"
          value={totalPhotos}
          href="/admin/photos"
          icon="photo"
          iconBg="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <Link key={a.title} href={a.href} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-card transition hover:-translate-y-0.5 hover:border-navyAccent hover:text-navyAccent hover:shadow-lift">
            <Icon name={a.icon} className="h-4 w-4 text-navyAccent" />
            {a.title}
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
          <h2 className="font-display text-base font-bold text-ink">Recent Activity</h2>
          <Link href="/admin/audit" className="text-xs font-semibold text-navyAccent hover:underline">View audit log</Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-inkSoft">No activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/60 bg-[#f8fafc] text-xs uppercase tracking-wide text-inkSoft">
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {recentLogs.map((l) => (
                  <tr key={l.id} className="transition hover:bg-[#f8fafc]">
                    <td className="px-5 py-3 font-semibold text-ink">{l.action}</td>
                    <td className="px-5 py-3 text-inkSoft">{l.userName || '—'}</td>
                    <td className="px-5 py-3 text-inkSoft/70">{formatRelative(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Management sections */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Manage the archive</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navyAccent/10 text-navyAccent transition group-hover:bg-navyAccent group-hover:text-white">
                  <Icon name={s.icon} className="h-5 w-5" />
                </div>
                {s.urgent && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" title="Action needed" />}
              </div>
              <h3 className="mt-3 font-display text-base font-bold text-ink group-hover:text-navyAccent">{s.title}</h3>
              <p className="mt-1 text-sm text-inkSoft">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}