import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { Icon } from '@/components/icons';
import { Collapsible } from '@/components/collapsible';
import { SuggestModal } from '@/components/suggest-modal';
import { ChangeProfilePhotoButton } from '@/components/change-profile-photo';
import { memberOptions } from '@/lib/members';
import { PHOTO_INCLUDE, serializePhoto } from '@/lib/photo-shared';
import { yearsRange, formatDate, fullName, photoUrl, isLiving, plural } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PARENT_TYPES = ['PARENT', 'ADOPTED_PARENT', 'STEP_PARENT'];

export default async function MemberProfilePage({ params, searchParams }: { params: { id: string }; searchParams: { suggest?: string } }) {
  const session = await getSession();
  const settings = await getSettings();
  const isAdmin = session?.role === 'ADMIN';

  const member = await prisma.familyMember.findUnique({
    where: { id: params.id },
    include: { profilePhoto: { select: { thumbPath: true, optimizedPath: true } } },
  });
  if (!member || member.deletedAt) notFound();

  const living = isLiving(member);
  const hideDetails = living && !isAdmin && settings.showLivingBirthYearOnly === 'true';
  const isSelf = session?.memberId === member.id;

  const rels = await prisma.relationship.findMany({
    where: { OR: [{ personId: member.id }, { relatedPersonId: member.id }] },
    include: { person: { include: { profilePhoto: { select: { thumbPath: true } } } }, relatedPerson: { include: { profilePhoto: { select: { thumbPath: true } } } } },
  });

  const otherOf = (r: (typeof rels)[number]) => (r.personId === member.id ? r.relatedPerson : r.person);

  const parents = rels.filter((r) => PARENT_TYPES.includes(r.type) && r.relatedPersonId === member.id).map((r) => ({ member: r.person, kind: r.type }));
  const children = rels.filter((r) => PARENT_TYPES.includes(r.type) && r.personId === member.id).map((r) => ({ member: r.relatedPerson, kind: r.type }));
  const spouses = rels.filter((r) => r.type === 'SPOUSE').map((r) => ({ member: otherOf(r), status: r.status, startDate: r.startDate, endDate: r.endDate }));
  const siblings = rels.filter((r) => r.type === 'SIBLING').map((r) => ({ member: otherOf(r) }));

  // Half-siblings via shared parents
  const parentIds = parents.map((p) => p.member.id);
  if (parentIds.length) {
    const halfSibs = await prisma.relationship.findMany({
      where: { type: 'PARENT', personId: { in: parentIds }, NOT: { relatedPersonId: member.id } },
      include: { relatedPerson: { include: { profilePhoto: { select: { thumbPath: true } } } } },
    });
    const halfIds = new Set(siblings.map((s) => s.member.id));
    for (const h of halfSibs) {
      if (!halfIds.has(h.relatedPersonId)) {
        siblings.push({ member: h.relatedPerson });
        halfIds.add(h.relatedPersonId);
      }
    }
  }

  // Grandparents & grandchildren (two hops)
  const grandparents = parents.length
    ? await prisma.relationship.findMany({
        where: { type: 'PARENT', relatedPersonId: { in: parentIds } },
        include: { person: { include: { profilePhoto: { select: { thumbPath: true } } } } },
      })
    : [];
  const childIds = children.map((c) => c.member.id);
  const grandchildren = childIds.length
    ? await prisma.relationship.findMany({
        where: { type: 'PARENT', personId: { in: childIds } },
        include: { relatedPerson: { include: { profilePhoto: { select: { thumbPath: true } } } } },
      })
    : [];

  const taggedPhotos = await prisma.photo.findMany({
    where: { approvalStatus: 'APPROVED', deletedAt: null, tags: { some: { memberId: member.id } } },
    include: { tags: { include: { member: { select: { id: true, firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  // Photos available for the profile-photo picker (tagged with this member, or all approved for admins)
  const profilePhotoOptions = await prisma.photo.findMany({
    where: {
      approvalStatus: 'APPROVED',
      deletedAt: null,
      ...(isAdmin ? {} : { tags: { some: { memberId: member.id } } }),
    },
    include: PHOTO_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  const allMembers = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) =>
    value ? (
      <div className="py-2">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-inkSoft">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
      </div>
    ) : null;

  const RelCard = ({ title, items, empty }: { title: string; items: Array<{ member: { id: string; firstName: string; lastName: string; birthDate?: Date | null; deathDate?: Date | null; profilePhoto?: { thumbPath?: string | null } | null }; kind?: string; status?: string; startDate?: Date | null }>; empty: string }) => (
    <Collapsible title={title} count={items.length}>
      {items.length === 0 ? (
        <p className="text-sm text-inkSoft">{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item, i) => (
            <li key={i}>
              <Link href={`/family/${item.member.id}`} className="flex items-center gap-2.5 rounded-xl border border-line/50 p-2.5 transition hover:border-gold hover:shadow-card">
                <img
                  src={photoUrl(item.member.profilePhoto)}
                  alt=""
                  className={`h-10 w-10 rounded-full border border-line object-cover ${item.member.deathDate ? 'grayscale' : ''}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{fullName(item.member)}</p>
                  <p className="text-[11px] text-inkSoft">
                    {yearsRange(item.member.birthDate, item.member.deathDate)}
                    {item.kind === 'ADOPTED_PARENT' ? ' · adopted' : item.kind === 'STEP_PARENT' ? ' · step' : ''}
                    {item.status === 'ENDED' ? ' · separated' : ''}
                    {item.startDate && item.member !== member ? ` · married ${formatDate(item.startDate, false)}` : ''}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Collapsible>
  );

  const years = yearsRange(member.birthDate, member.deathDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-line/60 bg-white shadow-card">
        <div className="h-32 bg-gradient-to-r from-parchment via-gold/20 to-parchment sm:h-40" />
        <div className="relative px-5 pb-5 sm:px-8">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={photoUrl(member.profilePhoto)}
                  alt={member.firstName}
                  className={`h-28 w-28 rounded-2xl border-4 border-white object-cover shadow-lift sm:h-32 sm:w-32 ${member.deathDate ? 'grayscale' : ''}`}
                />
                {(isAdmin || isSelf) && (
                  <ChangeProfilePhotoButton memberId={member.id} archivePhotos={profilePhotoOptions.map(serializePhoto)} />
                )}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{fullName(member)}</h1>
                  <span className={member.deathDate ? 'badge-neutral' : 'badge-green'}>{member.deathDate ? 'Deceased' : 'Living'}</span>
                  {member.branch && <span className="badge-gold">{member.branch}</span>}
                </div>
                <p className="mt-1 text-sm text-inkSoft">
                  {years}
                  {member.occupation && <span> · {member.occupation}</span>}
                  {!hideDetails && member.location && <span> · {member.location}</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {session ? (
                <SuggestModal members={memberOptions(allMembers)} defaultMemberId={member.id} open={searchParams.suggest === '1'} />
              ) : (
                <Link href={`/login?next=/family/${member.id}?suggest=1`} className="btn-ghost">
                  <Icon name="edit" className="h-4 w-4" /> Suggest a correction
                </Link>
              )}
              {isAdmin && (
                <Link href={`/admin/members/${member.id}`} className="btn-ghost">
                  <Icon name="edit" className="h-4 w-4" /> Edit
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Collapsible title="Biography">
            {member.biography ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-inkSoft">{member.biography}</p>
            ) : (
              <p className="text-sm italic text-inkSoft/70">No biography has been recorded yet.</p>
            )}
          </Collapsible>

          <RelCard title="Parents" items={parents} empty="No parents recorded." />
          <RelCard title="Children" items={children} empty="No children recorded." />
          <RelCard title="Grandchildren" items={grandchildren.map((g) => ({ member: g.relatedPerson }))} empty="No grandchildren recorded." />

          {taggedPhotos.length > 0 && (
            <Collapsible title={`Photos of ${member.firstName}`}>
              <div className="mb-3 flex items-center justify-between">
                <Link href="/photos" className="text-xs font-semibold text-goldDeep hover:text-gold">All photos</Link>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {taggedPhotos.map((p) => (
                  <Link key={p.id} href={`/photos?photo=${p.id}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line/60">
                    <img src={photoUrl(p, 'full')} alt={p.caption || 'Photo'} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  </Link>
                ))}
              </div>
            </Collapsible>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Collapsible title="Details">
            <dl className="divide-y divide-line/50">
              {member.nickname && <InfoRow label="Nickname" value={member.nickname} />}
              {member.maidenName && <InfoRow label="Maiden name" value={member.maidenName} />}
              {member.middleName && <InfoRow label="Middle name" value={member.middleName} />}
              <InfoRow label="Born" value={member.birthDate ? `${formatDate(member.birthDate)}${!hideDetails && member.birthPlace ? ` · ${member.birthPlace}` : ''}` : undefined} />
              {!hideDetails && <InfoRow label="Died" value={member.deathDate ? `${formatDate(member.deathDate)}${member.deathPlace ? ` · ${member.deathPlace}` : ''}` : undefined} />}
              {!hideDetails && member.occupation && <InfoRow label="Occupation" value={member.occupation} />}
              {!hideDetails && member.location && <InfoRow label="Location" value={member.location} />}
              {hideDetails && (
                <InfoRow label="Privacy" value="This member is living — detailed information is only shown to administrators." />
              )}
            </dl>
          </Collapsible>

          <RelCard title="Spouses" items={spouses} empty="No spouses recorded." />
          <RelCard title="Siblings" items={siblings} empty="No siblings recorded." />
          <RelCard title="Grandparents" items={grandparents.map((g) => ({ member: g.person }))} empty="No grandparents recorded." />

          <section className="card p-5">
            <h3 className="mb-2 font-display text-base font-bold text-ink">Quick links</h3>
            <div className="space-y-1.5 text-sm">
              <Link href="/tree" className="flex items-center gap-2 text-goldDeep hover:text-gold"><Icon name="tree" className="h-4 w-4" /> Open in family tree</Link>
              <Link href="/contributions" className="flex items-center gap-2 text-goldDeep hover:text-gold"><Icon name="inbox" className="h-4 w-4" /> My contributions</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}