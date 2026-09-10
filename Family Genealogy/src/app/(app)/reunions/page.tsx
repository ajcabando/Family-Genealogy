import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { NewReunionModal } from '@/components/new-reunion-modal';
import { Icon } from '@/components/icons';
import { formatDate, plural, photoUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReunionsPage() {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';

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

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Reunions</h1>
          <p className="mt-1 text-sm text-inkSoft">Every reunion, its albums, and the memories we made together.</p>
        </div>
        <NewReunionModal isAdmin={isAdmin} />
      </div>

      {events.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="calendar" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No reunions scheduled yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const totalPhotos = e.albums.reduce((sum, a) => sum + (countByAlbum.get(a.id) || 0), 0);
            const upcoming = new Date(e.date) >= new Date();
            return (
              <Link key={e.id} href={`/reunions/${e.id}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative h-44 overflow-hidden">
                  {e.coverPhoto ? (
                    <img src={photoUrl(e.coverPhoto, 'full')} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-parchment to-gold/20">
                      <Icon name="calendar" className="h-12 w-12 text-goldDeep/40" />
                    </div>
                  )}
                  <span className={`absolute left-3 top-3 ${upcoming ? 'badge-green' : 'badge-neutral'} bg-white/90 backdrop-blur`}>
                    {upcoming ? 'Upcoming' : 'Past'}
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="font-display text-lg font-bold text-ink group-hover:text-goldDeep">{e.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-inkSoft">
                    <Icon name="calendar" className="h-4 w-4" /> {formatDate(e.date)}
                    {e.location && (<><span>·</span><Icon name="mapPin" className="h-4 w-4" /> {e.location}</>)}
                  </p>
                  {e.description && <p className="mt-2 line-clamp-2 text-sm text-inkSoft">{e.description}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-inkSoft">
                    <span>{e.albums.length} {plural(e.albums.length, 'album')}</span>
                    <span className="font-semibold text-goldDeep">{plural(totalPhotos, 'photo')}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}