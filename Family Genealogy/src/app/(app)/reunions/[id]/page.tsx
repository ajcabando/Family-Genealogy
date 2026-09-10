import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PHOTO_INCLUDE, serializePhoto } from '@/lib/photo-shared';
import { PhotoGallery } from '@/components/photo-gallery';
import { EventUploader } from '@/components/event-uploader';
import { NewAlbumModal } from '@/components/new-album-modal';
import { DeleteAlbumButton } from '@/components/delete-album-button';
import { memberOptions } from '@/lib/members';
import { Icon } from '@/components/icons';
import { formatDate, plural, photoUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReunionDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { album?: string } }) {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';
  const settings = await getSettings();
  const approvalRequired = settings.photoApprovalRequired === 'true';

  const reunion = await prisma.reunionEvent.findUnique({
    where: { id: params.id },
    include: { coverPhoto: { select: { thumbPath: true, optimizedPath: true } }, albums: { orderBy: { createdAt: 'asc' } } },
  });
  if (!reunion) notFound();

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const counts = await prisma.albumPhoto.groupBy({ by: ['albumId'], _count: { photoId: true } });
  const countByAlbum = new Map(counts.map((c) => [c.albumId, c._count.photoId]));

  // ---- Album gallery view ----
  const albumParam = searchParams.album;
  if (albumParam) {
    const album = reunion.albums.find((a) => a.id === albumParam);
    if (!album) notFound();
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: { approvalStatus: 'APPROVED', deletedAt: null, albums: { some: { albumId: album.id } } },
        include: PHOTO_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 24,
      }),
      prisma.photo.count({ where: { approvalStatus: 'APPROVED', deletedAt: null, albums: { some: { albumId: album.id } } } }),
    ]);

    return (
      <div>
        <div className="mb-5">
          <Link href={`/reunions/${reunion.id}`} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-goldDeep hover:text-gold">
            <Icon name="chevronLeft" className="h-3.5 w-3.5" /> Back to {reunion.name}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{album.name}</h1>
              <p className="mt-1 text-sm text-inkSoft">
                {reunion.name} · {formatDate(reunion.date)} · {total} {plural(total, 'photo')}
              </p>
            </div>
            <EventUploader albums={reunion.albums} members={memberOptions(members)} approvalRequired={approvalRequired} />
          </div>
        </div>
        <PhotoGallery
          initialPhotos={photos.map(serializePhoto)}
          total={total}
          albumId={album.id}
          canDownload={settings.allowPhotoDownload === 'true'}
          members={memberOptions(members)}
        />
      </div>
    );
  }

  // ---- Overview: hero + album grid ----
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-line/60 bg-white shadow-card">
        {reunion.coverPhoto && (
          <div className="absolute inset-0">
            <img src={photoUrl(reunion.coverPhoto, 'full')} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent" />
          </div>
        )}
        <div className={`relative p-6 sm:p-10 ${reunion.coverPhoto ? 'text-white' : ''}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${reunion.coverPhoto ? 'text-white/70' : 'text-goldDeep'}`}>
            {new Date(reunion.date) >= new Date() ? 'Upcoming reunion' : 'Past reunion'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{reunion.name}</h1>
          <p className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${reunion.coverPhoto ? 'text-white/80' : 'text-inkSoft'}`}>
            <span className="flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4" /> {formatDate(reunion.date)}</span>
            {reunion.location && <span className="flex items-center gap-1.5"><Icon name="mapPin" className="h-4 w-4" /> {reunion.location}</span>}
          </p>
          {reunion.description && <p className={`mt-3 max-w-2xl text-sm ${reunion.coverPhoto ? 'text-white/75' : 'text-inkSoft'}`}>{reunion.description}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink">Albums</h2>
        <div className="flex items-center gap-2">
          <EventUploader albums={reunion.albums} members={memberOptions(members)} approvalRequired={approvalRequired} />
          <NewAlbumModal reunionId={reunion.id} isAdmin={isAdmin} />
        </div>
      </div>      {reunion.albums.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="photo" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No albums yet — create one and start collecting photos.</p>
        </div>
      ) : (
        <AlbumGrid reunionId={reunion.id} albums={reunion.albums} counts={countByAlbum} isAdmin={isAdmin} />
      )}
    </div>
  );
}

async function AlbumGrid({
  reunionId,
  albums,
  counts,
  isAdmin,
}: {
  reunionId: string;
  albums: { id: string; name: string; description: string | null }[];
  counts: Map<string, number>;
  isAdmin: boolean;
}) {
  const covers = await prisma.albumPhoto.findMany({
    where: { albumId: { in: albums.map((a) => a.id) }, photo: { approvalStatus: 'APPROVED', deletedAt: null } },
    include: { photo: { select: { optimizedPath: true, thumbPath: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const coverByAlbum = new Map<string, { optimizedPath: string | null; thumbPath: string }>();
  for (const c of covers) {
    if (!coverByAlbum.has(c.albumId)) coverByAlbum.set(c.albumId, c.photo);
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {albums.map((a) => {
        const cover = coverByAlbum.get(a.id);
        const count = counts.get(a.id) || 0;
        return (
          <div key={a.id} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
            <Link href={`/reunions/${reunionId}?album=${a.id}`} className="relative block h-44 overflow-hidden">
              {cover ? (
                <img src={photoUrl(cover, 'full')} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-parchment to-gold/20">
                  <Icon name="photo" className="h-10 w-10 text-goldDeep/40" />
                </div>
              )}
              <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                {plural(count, 'photo')}
              </span>
            </Link>
            <div className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-bold text-ink group-hover:text-goldDeep">{a.name}</h3>
                {a.description && <p className="truncate text-xs text-inkSoft">{a.description}</p>}
              </div>
              {isAdmin && <DeleteAlbumButton albumId={a.id} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
