import { prisma } from '@/lib/db';
import { FamilyTree } from '@/components/tree/family-tree';
import { TreeHeroBanner } from '@/components/tree/hero-banner';
import type { FindMemberOption } from '@/components/tree/find-member-card';
import { buildTreeData } from '@/lib/genealogy';
import type { TreeMemberInput, TreeRelInput } from '@/lib/genealogy';
import { getSettings } from '@/lib/settings';
import { fullName, yearsRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TreePage({ searchParams }: { searchParams: { focus?: string } }) {
  const settings = await getSettings();

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
    nickname: m.nickname,
    gender: m.gender,
    birthDate: m.birthDate,
    deathDate: m.deathDate,
    birthPlace: m.birthPlace,
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

  const layout = buildTreeData(data, rels);
  const generationCount = new Set([...layout.people.values()].map((p) => p.generation)).size || 1;
  const branchSet = new Set(members.filter((m) => m.branch).map((m) => m.branch as string));
  const branches = [...branchSet].sort();

  const findMembers: FindMemberOption[] = [...layout.people.values()].map((p) => ({
    id: p.id,
    name: fullName({ firstName: p.firstName, middleName: p.middleName, lastName: p.lastName }),
    years: yearsRange(p.birthYear ? `${p.birthYear}-01-01` : null, p.deathYear ? `${p.deathYear}-01-01` : null),
    branch: p.branch || undefined,
    generation: p.generation,
  }));

  return (
    <div className="space-y-6">
      {/* Decorative tree watermark behind the page content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 top-16 bottom-0 left-0 lg:left-64 z-0 bg-repeat"
        style={{ backgroundImage: "url('/tree-of-life.svg')", backgroundSize: '300px', opacity: 0.07 }}
      />

      {/* Hero banner */}
      <TreeHeroBanner
        familyName={settings.familyName || 'Cruz'}
        memberCount={members.length}
        generationCount={generationCount}
        branchCount={branches.length}
        members={findMembers}
        branches={branches}
        heroBackground={settings.treeHeroBackground}
        heroOpacity={settings.treeHeroBackgroundOpacity}
        heroPosY={settings.treeHeroBackgroundPosY}
      />

      {/* Tree canvas */}
      <div className="relative z-10">
        <FamilyTree members={data} relationships={rels} focusId={searchParams.focus} />
      </div>
    </div>
  );
}