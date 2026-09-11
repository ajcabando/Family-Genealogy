import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { Icon } from '@/components/icons';
import { yearsRange, formatDate, formatRelative, plural, photoUrl, fullName } from '@/lib/utils';
import { 
  StatCard, 
  MemberCard, 
  PhotoCard, 
  ReunionCard, 
  TimelineItem,
  HeroBanner 
} from '@/components/dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';
  const settings = await getSettings();

  const [
    memberCount,
    photoCount,
    reunionCount,
    branches,
    recentMembers,
    recentPhotos,
    upcomingReunions,
    recentEvents,
    featuredPhotos,
    pendingCount,
    livingCount,
  ] = await Promise.all([
    prisma.familyMember.count({ where: { deletedAt: null } }),
    prisma.photo.count({ where: { approvalStatus: 'APPROVED', deletedAt: null } }),
    prisma.reunionEvent.count(),
    prisma.familyMember.findMany({
      where: { deletedAt: null, branch: { not: null } },
      select: { branch: true },
      distinct: ['branch'],
    }),
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      include: { profilePhoto: { select: { thumbPath: true, optimizedPath: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.photo.findMany({
      where: { approvalStatus: 'APPROVED', deletedAt: null },
      include: { tags: { include: { member: { select: { id: true, firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.reunionEvent.findMany({ where: { date: { gte: new Date() } }, orderBy: { date: 'asc' }, take: 1 }),
    prisma.familyEvent.findMany({ orderBy: { eventDate: 'desc' }, take: 4 }),
    prisma.photo.findMany({
      where: { approvalStatus: 'APPROVED', deletedAt: null, favorite: true },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
    isAdmin ? prisma.changeRequest.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
    prisma.familyMember.count({ where: { deletedAt: null, deathDate: null } }),
  ]);

  const recentActivity = [
    { type: 'upload' as const, message: 'Maria Santos uploaded 12 photos', detail: '2026 Family Reunion • 1 hour ago', timestamp: new Date() },
    { type: 'update' as const, message: 'Pedro Cruz updated his profile', detail: '2 hours ago', timestamp: new Date() },
    { type: 'add' as const, message: 'New family member added', detail: 'Julia Cruz • 5 hours ago', timestamp: new Date() },
    { type: 'tag' as const, message: 'Ana Reyes tagged you in a photo', detail: '1998 Reunion Album • 1 day ago', timestamp: new Date() },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <HeroBanner familyName={settings.familyName} heroBackground={settings.heroBackground} heroOpacity={settings.heroBackgroundOpacity} heroPosY={settings.heroBackgroundPosY} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard 
          label="Family Members" 
          value={memberCount} 
          href="/family" 
          icon="users" 
          iconBg="bg-navyAccent/10 text-navyAccent"
          trend="↑+3 this year"
        />
        <StatCard 
          label="Living Members" 
          value={livingCount} 
          href="/family" 
          icon="user" 
          iconBg="bg-green-100 text-green-600"
          trend="87% living"
          trendColor="text-green-600"
        />
        <StatCard 
          label="Family Branches" 
          value={branches.length} 
          href="/tree" 
          icon="tree" 
          iconBg="bg-orange-100 text-orange-600"
          trend="+1 new"
          trendColor="text-orange-600"
        />
        <StatCard 
          label="Photos" 
          value={photoCount} 
          href="/photos" 
          icon="photo" 
          iconBg="bg-purple-100 text-purple-600"
          trend="+12 this month"
          trendColor="text-purple-600"
        />
        <StatCard 
          label="Reunions" 
          value={reunionCount} 
          href="/reunions" 
          icon="calendar" 
          iconBg="bg-blue-100 text-blue-600"
          trend="Next: Dec 27, 2026"
          trendColor="text-blue-600"
        />
        {isAdmin ? (
          <StatCard 
            label="Pending Approvals" 
            value={pendingCount} 
            href="/admin" 
            icon="shield" 
            iconBg="bg-red-100 text-red-600"
            trend="Needs review"
            trendColor="text-red-600"
          />
        ) : (
          <StatCard 
            label="Timeline" 
            value="—" 
            href="/timeline" 
            icon="clock" 
            iconBg="bg-gray-100 text-gray-600"
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left Column (2/3) */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          {/* Recently Added Members */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Recently added family members</h2>
              <Link href="/family" className="text-xs font-semibold text-navyAccent hover:underline">
                View all
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
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
          </section>

          {/* Recently Uploaded Photos */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Recently uploaded photos</h2>
              <Link href="/photos" className="text-xs font-semibold text-navyAccent hover:underline">
                Open gallery
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
          </section>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Upcoming Reunion */}
          {upcomingReunions.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Upcoming reunion</h2>
                <Link href="/reunions" className="text-xs font-semibold text-navyAccent hover:underline">
                  View all
                </Link>
              </div>
              <ReunionCard
                id={upcomingReunions[0].id}
                name={upcomingReunions[0].name}
                date={upcomingReunions[0].date}
                location={upcomingReunions[0].location}
              />
            </section>
          )}

          {/* Pending Approvals */}
          {isAdmin && (
            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Pending approvals</h2>
                <Link href="/admin/approvals" className="text-xs font-semibold text-navyAccent hover:underline">
                  Review all
                </Link>
              </div>
              {pendingCount > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-line/50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <Icon name="edit" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">Relationship change request</p>
                      <p className="text-xs text-inkSoft">Pedro Cruz → Child of Juan Cruz</p>
                      <p className="text-xs text-inkSoft/70 mt-0.5">Submitted by Maria Santos • 2 days ago</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                  All caught up — nothing pending.
                </p>
              )}
            </section>
          )}

          {/* Family History */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Family history</h2>
              <Link href="/timeline" className="text-xs font-semibold text-navyAccent hover:underline">
                View timeline
              </Link>
            </div>
            <ul className="space-y-1">
              {recentEvents.map((e) => (
                <TimelineItem
                  key={e.id}
                  title={e.title}
                  date={e.eventDate}
                  icon={e.eventType === 'REUNION' ? 'calendar' : 'user'}
                  iconBg={e.eventType === 'REUNION' ? 'reunion' : 'default'}
                />
              ))}
            </ul>
          </section>

          {/* Recent Activity */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Recent activity</h2>
              <Link href="/notifications" className="text-xs font-semibold text-navyAccent hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-line/50">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    activity.type === 'upload' ? 'bg-navyAccent/10 text-navyAccent' :
                    activity.type === 'update' ? 'bg-green-100 text-green-600' :
                    activity.type === 'add' ? 'bg-orange-100 text-orange-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <Icon name={
                      activity.type === 'upload' ? 'photo' :
                      activity.type === 'update' ? 'edit' :
                      activity.type === 'add' ? 'plus' : 'user'
                    } className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{activity.message}</p>
                    <p className="text-xs text-inkSoft">{activity.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
