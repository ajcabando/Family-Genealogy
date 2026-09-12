import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { EditMember } from '@/components/admin/edit-member';
import { RelationshipManager } from '@/components/admin/relationship-manager';
import { fullName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminMemberEditPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const member = await prisma.familyMember.findUnique({ where: { id: params.id } });
  if (!member) notFound();

  const [relationships, members] = await Promise.all([
    prisma.relationship.findMany({
      where: { OR: [{ personId: member.id }, { relatedPersonId: member.id }] },
      orderBy: { createdAt: 'asc' },
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
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{fullName(member)}</h1>
        <p className="mt-1 text-sm text-inkSoft">Edit profile information and manage family relationships.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <EditMember
          id={member.id}
          initial={{
            ...member,
            birthDate: member.birthDate ? member.birthDate.toISOString() : null,
            deathDate: member.deathDate ? member.deathDate.toISOString() : null,
            deletedAt: member.deletedAt ? member.deletedAt.toISOString() : null,
          }}
        />
        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Relationships</h2>
          <RelationshipManager
            memberId={member.id}
            members={members}
            relationships={relationships.map((r) => ({ ...r, startDate: r.startDate ? r.startDate.toISOString() : null }))}
          />
        </div>
      </div>
    </div>
  );
}