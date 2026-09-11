import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Directory } from '@/components/directory';
import type { DirectoryEntry } from '@/components/directory';
import { SuggestModal } from '@/components/suggest-modal';
import { Icon } from '@/components/icons';
import { memberOptions } from '@/lib/members';

export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';

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
      {/* Decorative tree watermark behind the page content (matches /tree) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 top-16 bottom-0 left-0 lg:left-64 z-0 bg-repeat"
        style={{ backgroundImage: "url('/tree-of-life.svg')", backgroundSize: '300px', opacity: 0.07 }}
      />

      <div className="relative z-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Members</h1>
          <p className="mt-1 text-sm text-inkSoft">Browse everyone in the archive — click a member to open their full profile.</p>
        </div>
        {isAdmin ? (
          <Link href="/admin/members" className="btn-primary">
            <Icon name="plus" className="h-4 w-4" /> Add Member
          </Link>
        ) : (
          <SuggestModal members={memberOptions(members.map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName })))} />
        )}
      </div>
      <Directory entries={entries} />
      </div>
    </div>
  );
}