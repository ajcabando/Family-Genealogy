import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const [pendingRequests, pendingPhotos, memberCount, userCount, pendingUsers] = await Promise.all([
    prisma.changeRequest.count({ where: { status: 'PENDING' } }),
    prisma.photo.count({ where: { approvalStatus: 'PENDING', deletedAt: null } }),
    prisma.familyMember.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.user.count({ where: { status: 'PENDING' } }),
  ]);

  const sections = [
    { href: '/admin/approvals', title: 'Pending Approvals', desc: `${pendingRequests} change request${pendingRequests === 1 ? '' : 's'} · ${pendingPhotos} photo${pendingPhotos === 1 ? '' : 's'}`, icon: 'shield', urgent: pendingRequests + pendingPhotos > 0 },
    { href: '/admin/members', title: 'Family Management', desc: `${memberCount} members · relationships · branches`, icon: 'users' },
    { href: '/admin/users', title: 'Users', desc: `${userCount} accounts · ${pendingUsers} pending approval`, icon: 'userPlus' },
    { href: '/admin/photos', title: 'Photo Review', desc: `${pendingPhotos} photo${pendingPhotos === 1 ? '' : 's'} awaiting review`, icon: 'photo' },
    { href: '/admin/audit', title: 'Audit Log', desc: 'Complete history of important changes', icon: 'clock' },
    { href: '/admin/settings', title: 'Settings & Backup', desc: 'Approvals, privacy, registration, backups', icon: 'filter' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Administration</h1>
        <p className="mt-1 text-sm text-inkSoft">Manage the family tree, approvals, accounts, and archive settings.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/12 text-goldDeep transition group-hover:bg-gold group-hover:text-white">
                <Icon name={s.icon} className="h-5 w-5" />
              </div>
              {s.urgent && <span className="h-2.5 w-2.5 rounded-full bg-rust" title="Action needed" />}
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-ink group-hover:text-goldDeep">{s.title}</h2>
            <p className="mt-1 text-sm text-inkSoft">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}