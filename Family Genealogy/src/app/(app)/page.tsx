import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { Icon } from '@/components/icons';
import { yearsRange, formatDate, formatRelative, plural, photoUrl, fullName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function StatCard({ label, value, href, icon }: { label: string; value: number | string; href: string; icon: string }) {
  return (
    <Link href={href} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-3xl font-bold text-ink">{value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-inkSoft">{label}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/12 text-goldDeep transition group-hover:bg-gold group-hover:text-white">
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

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
      take: 5,
    }),
    prisma.photo.findMany({
      where: { approvalStatus: 'APPROVED', deletedAt: null },
      include: { tags: { include: { member: { select: { id: true, firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.reunionEvent.findMany({ where: { date: { gte: new Date() } }, orderBy: { date: 'asc' }, take: 3 }),
    prisma.familyEvent.findMany({ orderBy: { eventDate: 'desc' }, take: 4 }),
    prisma.photo.findMany({
      where: { approvalStatus: 'APPROVED', deletedAt: null, favorite: true },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
    isAdmin ? prisma.changeRequest.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
    prisma.familyMember.count({ where: { deletedAt: null, deathDate: null } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-goldDeep via-goldDeep to-ink p-6 text-white shadow-lift sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-goldLight">Welcome to your family&apos;s heritage archive</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">The {settings.familyName} Family Archive</h1>
        <p className="mt-2 max-w-xl text-sm text-white/80">
          Discover your ancestors, explore family branches, relive reunion memories, and help preserve our story for future generations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Family Members" value={memberCount} href="/family" icon="users" />
        <StatCard label="Living Members" value={livingCount} href="/family" icon="user" />
        <StatCard label="Branches" value={branches.length} href="/tree" icon="tree" />
        <StatCard label="Photos" value={photoCount} href="/photos" icon="photo" />
        <StatCard label="Reunions" value={reunionCount} href="/reunions" icon="calendar" />
        {isAdmin ? (
          <StatCard label="Pending Approvals" value={pendingCount} href="/admin" icon="shield" />
        ) : (
          <StatCard label="Timeline" value="—" href="/timeline" icon="clock" />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left column */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Recently added family members</h2>
              <Link href="/family" className="text-xs font-semibold text-goldDeep hover:text-gold">View all</Link>
            </div>
            <ul className="divide-y divide-line/50">
              {recentMembers.map((m) => (
                <li key={m.id}>
                  <Link href={`/family/${m.id}`} className="flex items-center gap-3 py-2.5 transition hover:bg-parchment/40">
                    <img
                      src={photoUrl(m.profilePhoto)}
                      alt=""
                      className={`h-11 w-11 rounded-full border border-line object-cover ${m.deathDate ? 'grayscale' : ''}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{fullName(m)}</p>
                      <p className="text-xs text-inkSoft">
                        {yearsRange(m.birthDate, m.deathDate)} {m.branch ? `· ${m.branch}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] text-inkSoft/70">{formatRelative(m.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Recently uploaded photos</h2>
              <Link href="/photos" className="text-xs font-semibold text-goldDeep hover:text-gold">Open gallery</Link>
            </div>
            {/* Horizontal scroller on mobile, grid on larger screens */}
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
              {recentPhotos.map((p) => (
                <Link
                  key={p.id}
                  href={`/photos?photo=${p.id}`}
                  className="group relative aspect-square w-28 shrink-0 snap-start overflow-hidden rounded-xl border border-line/60 sm:w-auto"
                >
                  <img
                    src={photoUrl(p, 'full')}
                    alt={p.caption || 'Family photo'}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {p.tags.length > 0 && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {p.tags.length} {plural(p.tags.length, 'person')} tagged
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Featured photos</h2>
              <Link href="/photos" className="text-xs font-semibold text-goldDeep hover:text-gold">Browse all</Link>
            </div>
            {featuredPhotos.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {featuredPhotos.map((p) => (
                  <Link key={p.id} href={`/photos?photo=${p.id}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line/60">
                    <img src={photoUrl(p, 'full')} alt={p.caption || 'Photo'} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    <span className="absolute right-1.5 top-1.5 text-gold"><Icon name="heart" className="h-4 w-4 fill-gold" /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-inkSoft">No favorites yet — tap the ♥ on any photo to feature it here.</p>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {isAdmin && (
            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Pending approvals</h2>
                <Link href="/admin" className="text-xs font-semibold text-goldDeep hover:text-gold">Review</Link>
              </div>
              <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-goldDeep">
                {pendingCount > 0 ? `${pendingCount} change request${pendingCount === 1 ? '' : 's'} waiting for your review.` : 'All caught up — nothing pending.'}
              </p>
            </section>
          )}

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Upcoming reunions</h2>
              <Link href="/reunions" className="text-xs font-semibold text-goldDeep hover:text-gold">All reunions</Link>
            </div>
            {upcomingReunions.length ? (
              <ul className="space-y-3">
                {upcomingReunions.map((r) => (
                  <li key={r.id}>
                    <Link href={`/reunions/${r.id}`} className="block rounded-xl border border-line/50 p-3.5 transition hover:border-gold hover:shadow-card">
                      <p className="text-sm font-bold text-ink">{r.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-inkSoft">
                        <Icon name="calendar" className="h-3.5 w-3.5" /> {formatDate(r.date)}
                        {r.location && <><span>·</span><Icon name="mapPin" className="h-3.5 w-3.5" /> {r.location}</>}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-inkSoft">No upcoming reunions scheduled.</p>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Family history</h2>
              <Link href="/timeline" className="text-xs font-semibold text-goldDeep hover:text-gold">Timeline</Link>
            </div>
            <ul className="relative ml-2 space-y-4 border-l border-line pl-5">
              {recentEvents.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-gold bg-white" />
                  <p className="text-sm font-semibold text-ink">{e.title}</p>
                  <p className="text-xs text-inkSoft">{formatDate(e.eventDate)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}