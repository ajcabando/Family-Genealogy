import { prisma } from '@/lib/db';
import { FamilyTree } from '@/components/tree/family-tree';
import type { TreeMemberInput, TreeRelInput } from '@/lib/genealogy';

export const dynamic = 'force-dynamic';

export default async function TreePage() {
  const [members, relationships] = await Promise.all([
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      include: { profilePhoto: { select: { thumbPath: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.relationship.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const data: TreeMemberInput[] = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    middleName: m.middleName,
    lastName: m.lastName,
    gender: m.gender,
    birthDate: m.birthDate,
    deathDate: m.deathDate,
    branch: m.branch,
    occupation: m.occupation,
    location: m.location,
    profilePhoto: m.profilePhoto,
  }));

  const rels: TreeRelInput[] = relationships.map((r) => ({
    id: r.id,
    personId: r.personId,
    relatedPersonId: r.relatedPersonId,
    type: r.type,
    startDate: r.startDate,
    status: r.status,
  }));

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Tree</h1>
          <p className="mt-1 text-sm text-inkSoft">
            Explore {members.length} family members across generations. Click a card for details, use +/− to expand or collapse branches.
          </p>
        </div>
      </div>
      <FamilyTree members={data} relationships={rels} />
    </div>
  );
}