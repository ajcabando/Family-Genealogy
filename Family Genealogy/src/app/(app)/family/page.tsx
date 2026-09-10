import { prisma } from '@/lib/db';
import { Directory } from '@/components/directory';
import type { DirectoryEntry } from '@/components/directory';

export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    include: { profilePhoto: { select: { thumbPath: true, optimizedPath: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const entries: DirectoryEntry[] = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    middleName: m.middleName,
    lastName: m.lastName,
    birthDate: m.birthDate ? m.birthDate.toISOString() : null,
    deathDate: m.deathDate ? m.deathDate.toISOString() : null,
    branch: m.branch,
    occupation: m.occupation,
    location: m.location,
    photo: m.profilePhoto,
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Directory</h1>
        <p className="mt-1 text-sm text-inkSoft">Browse everyone in the archive — click a member to open their full profile.</p>
      </div>
      <Directory entries={entries} />
    </div>
  );
}