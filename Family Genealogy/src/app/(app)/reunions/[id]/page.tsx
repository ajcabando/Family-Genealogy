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
import { AlbumCoverButton } from '@/components/album-cover-button';
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
    include: { albums: { orderBy: { createdAt: 'asc' } } },
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
            {session ? (
              <EventUploader albums={reunion.albums} members={memberOptions(members)} approvalRequired={approvalRequired} />
            ) : (
              <Link href="/login" className="btn-primary">
                <Icon name="camera" className="h-4 w-4" /> Sign in to upload
              </Link>
            )}
          </div>
        </div>
        <PhotoGallery
          initialPhotos={photos.map(serializePhoto)}
          total={total}
          albumId={album.id}
          canDownload={settings.allowPhotoDownload === 'true'}
          canEdit={!!session}
          members={memberOptions(members)}
          currentMemberId={session?.memberId}
        />
      </div>
    );
  }

  // ---- Overview: hero + album grid ----
  // Hero background mirrors the dashboard hero (admin-configurable image + opacity/posY).
  const heroBgUrl = settings.heroBackground ? `/api/files/${settings.heroBackground}` : '/hero-beach.svg';
  const heroOpacity = Math.min(100, Math.max(10, parseInt(settings.heroBackgroundOpacity || '60', 10))) / 100;
  const heroPosY = Math.min(100, Math.max(0, parseInt(settings.heroBackgroundPosY || '50', 10)));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navyLight to-navy p-6 text-white shadow-lift sm:p-10">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroBgUrl}')`, opacity: heroOpacity, backgroundPositionY: `${heroPosY}%` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/60 via-navy/40 to-navy/30" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {new Date(reunion.date) >= new Date() ? 'Upcoming reunion' : 'Past reunion'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{reunion.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4" /> {formatDate(reunion.date)}</span>
            {reunion.location && <span className="flex items-center gap-1.5"><Icon name="mapPin" className="h-4 w-4" /> {reunion.location}</span>}
          </p>
          {reunion.description && <p className="mt-3 max-w-2xl text-sm text-white/75">{reunion.description}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink">Albums</h2>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <EventUploader albums={reunion.albums} members={memberOptions(members)} approvalRequired={approvalRequired} />
              <NewAlbumModal reunionId={reunion.id} />
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              <Icon name="camera" className="h-4 w-4" /> Sign in to upload
            </Link>
          )}
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
  albums: { id: string; name: string; description: string | null; coverPhotoId: string | null }[];
  counts: Map<string, number>;
  isAdmin: boolean;
}) {
  const covers = await prisma.albumPhoto.findMany({
    where: { albumId: { in: albums.map((a) => a.id) }, photo: { approvalStatus: 'APPROVED', deletedAt: null } },
    include: { photo: { select: { id: true, optimizedPath: true, thumbPath: true } } },
  });
  // Cover per album: the pinned photo if set, otherwise a random one (fresh highlight on every visit).
  const photosByAlbum = new Map<string, { id: string; optimizedPath: string | null; thumbPath: string }[]>();
  for (const c of covers) {
    const list = photosByAlbum.get(c.albumId);
    if (list) list.push(c.photo);
    else photosByAlbum.set(c.albumId, [c.photo]);
  }
  const coverByAlbum = new Map<string, { id: string; optimizedPath: string | null; thumbPath: string }>();
  for (const album of albums) {
    const list = photosByAlbum.get(album.id) || [];
    if (list.length === 0) continue;
    const pinned = album.coverPhotoId ? list.find((p) => p.id === album.coverPhotoId) : null;
    coverByAlbum.set(album.id, pinned || list[Math.floor(Math.random() * list.length)]);
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {albums.map((a) => {
        const cover = coverByAlbum.get(a.id);
        const count = counts.get(a.id) || 0;
        return (
          <div key={a.id} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
            <Link href={`/reunions/${reunionId}?album=${a.id}`} className="relative block h-44 overflow-hidden">
              {isAdmin && <span className="absolute right-2 top-2 z-10"><AlbumCoverButton albumId={a.id} coverPhotoId={a.coverPhotoId} /></span>}
              {isAdmin && a.coverPhotoId && (
                <span className="absolute left-2 top-2 z-10 rounded-full bg-goldDeep px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-card">
                  Pinned
                </span>
              )}
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
