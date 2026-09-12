import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { UserManager } from '@/components/admin/user-manager';
import { fullName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const [users, members] = await Promise.all([
    prisma.user.findMany({
      include: { familyMember: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Users &amp; Accounts</h1>
        <p className="mt-1 text-sm text-inkSoft">
          Approve registration requests, manage roles, link accounts to family members, and reset passwords.
        </p>
      </div>
      <UserManager
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          status: u.status,
          memberId: u.familyMemberId,
          memberName: u.familyMember ? fullName(u.familyMember) : null,
          createdAt: u.createdAt.toISOString(),
        }))}
        members={members.map((m) => ({ id: m.id, name: fullName(m) }))}
      />
    </div>
  );
}