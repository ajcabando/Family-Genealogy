import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { MemberManager } from '@/components/admin/member-manager';

export const dynamic = 'force-dynamic';

export default async function AdminMembersPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const members = await prisma.familyMember.findMany({
    include: { profilePhoto: { select: { thumbPath: true } } },
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Management</h1>
        <p className="mt-1 text-sm text-inkSoft">
          Add, edit, remove, restore, and merge family member records. Genealogy edits here update the official tree immediately.
        </p>
      </div>
      <MemberManager
        members={members.map((m) => ({
          ...m,
          birthDate: m.birthDate ? m.birthDate.toISOString() : null,
          deathDate: m.deathDate ? m.deathDate.toISOString() : null,
          deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}