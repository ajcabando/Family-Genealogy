import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { Icon } from '@/components/icons';
import { formatDate, photoUrl, fullName } from '@/lib/utils';
import {
  StatCard,
  MemberCard,
  PhotoCard,
  ReunionCard,
  TimelineItem,
  ActivityItem,
  HeroBanner,
} from '@/components/dashboard';
import { buildTreeData, type TreeMemberInput, type TreeRelInput } from '@/lib/genealogy';

export const dynamic = 'force-dynamic';

const REQUEST_LABELS: Record<string, { label: string; chip: string; icon: string }> = {
  NEW_MEMBER: { label: 'New family member', chip: 'chip-green', icon: 'userPlus' },
  RELATIONSHIP: { label: 'Relationship change', chip: 'chip-purple', icon: 'link' },
  PROFILE_UPDATE: { label: 'Profile update', chip: 'chip-blue', icon: 'edit' },
};

function SectionHeader({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="section-title">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-xs font-semibold text-primary hover:underline">
          {cta || 'View all'}
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';
  const settings = await getSettings();

  const [
    members,
    relationships,
    memberCount,
    livingCount,
    photoCount,
    reunionCount,
    recentMembers,
    recentPhotos,
    upcomingReunions,
    recentEvents,
    pendingCount,
  ] = await Promise.all([
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      include: { profilePhoto: { select: { thumbPath: true, optimizedPath: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.relationship.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.familyMember.count({ where: { deletedAt: null } }),
    prisma.familyMember.count({ where: { deletedAt: null, deathDate: null } }),
    prisma.photo.count({ where: { approvalStatus: 'APPROVED', deletedAt: null } }),
    prisma.reunionEvent.count(),
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      include: { profilePhoto: { select: { thumbPath: true, optimizedPath: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.photo.findMany({
      where: { approvalStatus: 'APPROVED', deletedAt: null },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.reunionEvent.findMany({
      where: { date: { gte: new Date() } },
      include: { coverPhoto: { select: { thumbPath: true, optimizedPath: true } } },
      orderBy: { date: 'asc' },
      take: 1,
    }),
    prisma.familyEvent.findMany({ orderBy: { eventDate: 'desc' }, take: 4 }),
    isAdmin ? prisma.changeRequest.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
  ]);

  // Fetched separately so the include type survives; only admins see the queue.
  const pendingRequests = isAdmin
    ? await prisma.changeRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          submittedBy: {
            select: { email: true, familyMember: { select: { firstName: true, lastName: true } } },
          },
          targetMember: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })
    : [];

  // Generations come from the same layout the family tree renders.
  const treeData: TreeMemberInput[] = members.map((m) => ({
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
  const treeRels: TreeRelInput[] = relationships.map((r) => ({
    id: r.id,
    personId: r.personId,
    relatedPersonId: r.relatedPersonId,
    type: r.type,
    startDate: r.startDate,
    status: r.status,
  }));
  const layout = buildTreeData(treeData, treeRels);
  const generationCount = new Set([...layout.people.values()].map((p) => p.generation)).size || 1;
  const branches = [...new Set(members.filter((m) => m.branch).map((m) => m.branch as string))].sort();

  const nextReunion = upcomingReunions[0];

  // Real activity, newest first, drawn from the records the archive already tracks.
  const activity = [
    ...recentPhotos.map((p) => ({
      id: `photo-${p.id}`,
      type: 'upload' as const,
      message: p.uploader ? `${fullName(p.uploader)} uploaded a photo` : 'A new photo was added',
      detail: p.caption || 'Family photo',
      timestamp: p.createdAt,
      href: `/photos?photo=${p.id}`,
    })),
    ...recentMembers.map((m) => ({
      id: `member-${m.id}`,
      type: 'add' as const,
      message: 'New family member added',
      detail: fullName(m),
      timestamp: m.createdAt,
      href: `/family/${m.id}`,
    })),
    ...recentEvents.map((e) => ({
      id: `event-${e.id}`,
      type: 'update' as const,
      message: e.title,
      detail: `Timeline • ${formatDate(e.eventDate)}`,
      timestamp: e.eventDate,
      href: '/timeline',
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <HeroBanner
        familyName={settings.familyName}
        heroBackground={settings.heroBackground}
        heroOpacity={settings.heroBackgroundOpacity}
        heroPosY={settings.heroBackgroundPosY}
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Family Members"
          value={memberCount}
          href="/family"
          icon="users"
          iconBg="chip-purple"
          trend={`${livingCount} living`}
        />
        <StatCard label="Generations" value={generationCount} href="/tree" icon="tree" iconBg="chip-blue" />
        <StatCard
          label="Family Branches"
          value={branches.length}
          href="/family"
          icon="sparkle"
          iconBg="chip-teal"
        />
        <StatCard label="Photos" value={photoCount} href="/photos" icon="photo" iconBg="chip-coral" />
        <StatCard
          label="Reunions"
          value={reunionCount}
          href="/reunions"
          icon="calendar"
          iconBg="chip-gold"
          trend={nextReunion ? `Next: ${formatDate(nextReunion.date)}` : undefined}
        />
        {isAdmin ? (
          <StatCard
            label="Pending Approvals"
            value={pendingCount}
            href="/admin/approvals"
            icon="shield"
            iconBg="chip-green"
            trend={pendingCount > 0 ? 'Needs review' : 'All clear'}
          />
        ) : (
          <StatCard label="Timeline" value={recentEvents.length} href="/timeline" icon="clock" iconBg="chip-green" />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ---- Left column ---- */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section>
            <SectionHeader title="Recently added family members" href="/family" cta="View all" />
            {recentMembers.length === 0 ? (
              <div className="card p-6 text-center text-sm text-subtext">No family members yet.</div>
            ) : (
              <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide sm:gap-4">
                {recentMembers.map((m) => (
                  <div key={m.id} className="snap-start">
                    <MemberCard
                      id={m.id}
                      firstName={m.firstName}
                      lastName={m.lastName}
                      birthDate={m.birthDate}
                      deathDate={m.deathDate}
                      branch={m.branch}
                      profilePhoto={m.profilePhoto}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="Recently uploaded photos" href="/photos" cta="Open gallery" />
            {recentPhotos.length === 0 ? (
              <div className="card flex flex-col items-center gap-2 p-8 text-center">
                <Icon name="photo" className="h-7 w-7 text-subtext/40" />
                <p className="text-sm text-subtext">No photos in the archive yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {recentPhotos.map((p) => (
                  <PhotoCard
                    key={p.id}
                    id={p.id}
                    caption={p.caption}
                    photoDate={p.photoDate}
                    createdAt={p.createdAt}
                    optimizedPath={p.optimizedPath}
                    thumbPath={p.thumbPath}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ---- Right column ---- */}
        <div className="min-w-0 space-y-6">
          {nextReunion && (
            <section>
              <SectionHeader title="Upcoming reunion" href="/reunions" cta="View all" />
              <ReunionCard
                id={nextReunion.id}
                name={nextReunion.name}
                date={nextReunion.date}
                location={nextReunion.location}
                coverPhoto={nextReunion.coverPhoto ? photoUrl(nextReunion.coverPhoto, 'full') : null}
              />
            </section>
          )}

          {isAdmin && (
            <section className="card p-5">
              <SectionHeader title="Pending approvals" href="/admin/approvals" cta="Review all" />
              {pendingRequests.length === 0 ? (
                <p className="rounded-xl bg-accentGreenSoft px-4 py-3 text-sm font-medium text-accentGreen">
                  All caught up — nothing pending.
                </p>
              ) : (
                <ul className="space-y-3">
                  {pendingRequests.map((cr) => {
                    const meta = REQUEST_LABELS[cr.requestType] || REQUEST_LABELS.PROFILE_UPDATE;
                    const target = cr.targetMember ? fullName(cr.targetMember) : 'New record';
                    return (
                      <li key={cr.id}>
                        <Link
                          href="/admin/approvals"
                          className="flex items-start gap-3 rounded-xl border border-line/70 p-3 transition hover:border-primary/30 hover:bg-appBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                        >
                          <span className={`chip h-8 w-8 ${meta.chip}`}>
                            <Icon name={meta.icon} className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{meta.label}</span>
                            <span className="block truncate text-xs text-subtext">{target}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-subtext/80">
                              {(cr.submittedBy?.familyMember
                                ? fullName(cr.submittedBy.familyMember)
                                : cr.submittedBy?.email) || 'Unknown'}{' '}
                              • {formatDate(cr.createdAt)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          <section className="card p-5">
            <SectionHeader title="Family history" href="/timeline" cta="View timeline" />
            {recentEvents.length === 0 ? (
              <p className="text-sm text-subtext">No timeline events yet.</p>
            ) : (
              <ul className="space-y-0">
                {recentEvents.map((e) => (
                  <TimelineItem
                    key={e.id}
                    title={e.title}
                    date={e.eventDate}
                    icon={e.eventType === 'REUNION' ? 'calendar' : 'clock'}
                    iconBg={e.eventType === 'REUNION' ? 'reunion' : 'default'}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <SectionHeader title="Recent activity" href="/notifications" cta="View all" />
            {activity.length === 0 ? (
              <p className="text-sm text-subtext">Nothing has happened yet.</p>
            ) : (
              <div className="divide-y divide-line/60">
                {activity.map((item) => (
                  <ActivityItem
                    key={item.id}
                    type={item.type}
                    message={item.message}
                    detail={item.detail}
                    timestamp={item.timestamp}
                    href={item.href}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
