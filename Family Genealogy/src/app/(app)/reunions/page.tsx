import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { NewReunionModal } from '@/components/new-reunion-modal';
import { Icon } from '@/components/icons';
import { cn, formatDate, plural, photoUrl } from '@/lib/utils';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

type Tab = 'upcoming' | 'past' | 'all';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past Events' },
  { key: 'all', label: 'All Events' },
];

export default async function ReunionsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';
  const tab: Tab = searchParams.tab === 'past' ? 'past' : searchParams.tab === 'all' ? 'all' : 'upcoming';

  const events = await prisma.reunionEvent.findMany({
    include: {
      coverPhoto: { select: { thumbPath: true, optimizedPath: true } },
      albums: { include: { _count: { select: { photos: true } } } },
    },
    orderBy: { date: 'desc' },
  });

  const photoCounts = await prisma.albumPhoto.groupBy({
    by: ['albumId'],
    _count: { photoId: true },
  });
  const countByAlbum = new Map(photoCounts.map((c) => [c.albumId, c._count.photoId]));

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now).sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = events.filter((e) => new Date(e.date) < now);
  const list = tab === 'upcoming' ? upcoming : tab === 'past' ? past : events;
  const featured = tab === 'upcoming' && upcoming.length > 0 ? upcoming[0] : null;
  const rest = featured ? list.filter((e) => e.id !== featured.id) : list;

  const statsFor = (e: (typeof events)[number]) => {
    const totalPhotos = e.albums.reduce((sum, a) => sum + (countByAlbum.get(a.id) || 0), 0);
    return { totalPhotos, albums: e.albums.length };
  };

  return (
    <div className="space-y-6">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Reunions</h1>
          <p className="mt-1 text-sm text-inkSoft">Every reunion, its albums, and the memories we made together.</p>
        </div>
        <NewReunionModal isAdmin={isAdmin} label="Create Event" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/reunions${t.key === 'upcoming' ? '' : `?tab=${t.key}`}`}
            className={cn('pill shrink-0', tab === t.key ? 'pill-active' : 'pill-inactive')}
            aria-current={tab === t.key ? 'page' : undefined}
          >
            {t.label}
            {t.key === 'upcoming' && upcoming.length > 0 && <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{upcoming.length}</span>}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="calendar" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No reunions scheduled yet.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="calendar" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">{tab === 'upcoming' ? 'No upcoming reunions — check back soon.' : 'No reunions here yet.'}</p>
        </div>
      ) : (
        <>
          {/* Featured upcoming reunion */}
          {featured && (
            <FeaturedReunion event={featured} stats={statsFor(featured)} />
          )}

          {/* Remaining events */}
          {rest.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold text-ink">
                {tab === 'upcoming' ? 'More upcoming reunions' : tab === 'past' ? 'Past reunions' : 'All reunions'}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                {rest.map((e) => {
                  const { totalPhotos, albums } = statsFor(e);
                  return (
                    <Link key={e.id} href={`/reunions/${e.id}`} className="group w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-line/60 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                      <div className="relative h-36 overflow-hidden">
                        {e.coverPhoto ? (
                          <img src={photoUrl(e.coverPhoto, 'full')} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-parchment to-gold/20">
                            <Icon name="calendar" className="h-10 w-10 text-goldDeep/40" />
                          </div>
                        )}
                        <span className={cn('absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur', new Date(e.date) >= now ? 'text-green-700' : 'text-inkSoft')}>
                          {new Date(e.date) >= now ? 'Upcoming' : 'Past'}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-sm font-bold text-ink group-hover:text-goldDeep">{e.name}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-inkSoft">
                          <Icon name="calendar" className="h-3 w-3" /> {formatDate(e.date)}
                        </p>
                        {e.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-inkSoft">
                            <Icon name="mapPin" className="h-3 w-3" /> {e.location}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-inkSoft">
                          <span>{plural(totalPhotos, 'photo')}</span>
                          <span className="text-navyAccent">{plural(albums, 'album')} →</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FeaturedReunion({ event, stats }: { event: { id: string; name: string; date: Date; location: string | null; coverPhoto: { thumbPath: string | null; optimizedPath: string | null } | null }; stats: { totalPhotos: number; albums: number } }) {
  const d = dayjs(event.date);
  return (
    <Link href={`/reunions/${event.id}`} className="group relative block overflow-hidden rounded-3xl shadow-lift">
      {event.coverPhoto ? (
        <img src={photoUrl(event.coverPhoto, 'full')} alt={event.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navyLight to-navy" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/20" />

      <div className="relative z-10 flex min-h-[260px] flex-wrap items-center gap-6 p-7 sm:p-9">
        {/* Date badge */}
        <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-navy text-white shadow-card">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">{d.format('MMM')}</p>
          <p className="font-display text-4xl font-bold leading-tight">{d.format('DD')}</p>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{event.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/85">
            {event.location && (
              <span className="flex items-center gap-1.5">
                <Icon name="mapPin" className="h-4 w-4" /> {event.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Icon name="calendar" className="h-4 w-4" /> {formatDate(event.date)}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-white/90">
            {plural(stats.totalPhotos, 'photo')}
            {stats.albums > 0 && <> · {plural(stats.albums, 'album')}</>}
          </p>
        </div>

        <span className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink shadow-card transition group-hover:bg-navyAccent group-hover:text-white">
          View Event →
        </span>
      </div>
    </Link>
  );
}