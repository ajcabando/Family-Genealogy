import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PHOTO_INCLUDE, serializePhoto } from '@/lib/photo-shared';
import { PhotoGallery } from '@/components/photo-gallery';
import { UploadButton } from '@/components/upload-button';
import { PhotosHeroBanner } from '@/components/photos/hero-banner';
import { PhotosFilterBar } from '@/components/photos/filter-bar';
import { PhotoSearch } from '@/components/photos/photo-search';
import { AlbumsSection, type AlbumItem } from '@/components/photos/albums-section';
import { Icon } from '@/components/icons';
import { memberOptions } from '@/lib/members';
import { photoUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: { photo?: string; person?: string; album?: string; favorites?: string; location?: string; sort?: string; view?: string; viewmode?: string; q?: string };
}) {
  const session = await getSession();
  const settings = await getSettings();
  const approvalRequired = settings.photoApprovalRequired === 'true';

  const personFilter = searchParams.person;
  const albumFilter = searchParams.album;
  const favoritesOnly = searchParams.favorites === '1';
  const locationFilter = searchParams.location;
  const sort = searchParams.sort === 'oldest' ? 'oldest' : 'newest';
  const query = searchParams.q?.trim() || undefined;

  const where = {
    approvalStatus: 'APPROVED' as const,
    deletedAt: null,
    ...(personFilter ? { tags: { some: { memberId: personFilter } } } : {}),
    ...(albumFilter ? { albums: { some: { albumId: albumFilter } } } : {}),
    ...(favoritesOnly ? { favorite: true } : {}),
    ...(locationFilter ? { location: locationFilter } : {}),
    ...(query ? { caption: { contains: query, mode: 'insensitive' as const } } : {}),
  };

  const [photos, total, members, albums, locations] = await Promise.all([
    prisma.photo.findMany({
      where,
      include: PHOTO_INCLUDE,
      orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
      take: PAGE_SIZE,
    }),
    prisma.photo.count({ where }),
    prisma.familyMember.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] }),
    prisma.reunionAlbum.findMany({
      include: {
        photos: {
          include: { photo: { select: { thumbPath: true, optimizedPath: true } } },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.photo.findMany({
      where: { approvalStatus: 'APPROVED', deletedAt: null, location: { not: null } },
      select: { location: true },
      distinct: ['location'],
      orderBy: { location: 'asc' },
    }),
  ]);

  const contributorCountDistinct = await prisma.photo.groupBy({
    by: ['uploadedById'],
    where: { approvalStatus: 'APPROVED', deletedAt: null, uploadedById: { not: null } },
    _count: { _all: true },
  });

  const albumItems: AlbumItem[] = albums.map((a) => ({
    id: a.id,
    name: a.name,
    photoCount: a.photos.length,
    coverThumb: a.photos[0]?.photo ? photoUrl(a.photos[0].photo, 'full') : null,
  }));

  const locationOptions = locations.map((l) => l.location as string);
  const activeAlbum = albumFilter ? albums.find((a) => a.id === albumFilter) : undefined;
  const albumContext = activeAlbum ? { name: activeAlbum.name, href: `/photos?album=${activeAlbum.id}`, total } : null;

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <PhotosHeroBanner
        totalPhotos={total}
        totalAlbums={albumItems.length}
        contributors={contributorCountDistinct.length}
        heroBackground={settings.photosHeroBackground}
        heroOpacity={settings.photosHeroBackgroundOpacity}
        heroPosY={settings.photosHeroBackgroundPosY}
        action={
          session ? (
            <UploadButton
              members={memberOptions(members)}
              approvalRequired={approvalRequired}
              label="Upload Photos"
            />
          ) : (
            <Link href="/login?next=/photos" className="inline-flex items-center gap-2 rounded-xl bg-navyAccent px-5 py-3 text-sm font-bold text-white shadow-lift transition hover:bg-navyAccent/90">
              <Icon name="upload" className="h-4 w-4" />
              Sign in to upload
            </Link>
          )
        }
      />

      {/* Filter / sub-nav bar */}
      <PhotosFilterBar members={memberOptions(members)} locations={locationOptions} />

      {/* Albums */}
      {searchParams.view !== 'albums' && (
        <AlbumsSection albums={albumItems} />
      )}
      {searchParams.view === 'albums' && (
        <AlbumsSection albums={albumItems} full />
      )}

      {/* All photos */}
      {searchParams.view !== 'albums' && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">All Photos</h2>
              <p className="mt-0.5 text-sm text-inkSoft">A collection of our family&rsquo;s special moments.</p>
            </div>
            <PhotoSearch />
          </div>

          <PhotoGallery
            initialPhotos={photos.map(serializePhoto)}
            total={total}
            albumId={albumFilter}
            personId={personFilter}
            favoritesOnly={favoritesOnly}
            locationFilter={locationFilter}
            sort={sort}
            query={query}
            viewMode={searchParams.viewmode === 'list' ? 'list' : 'grid'}
            canDownload={settings.allowPhotoDownload === 'true'}
            canEdit={!!session}
            isAdmin={session?.role === 'ADMIN'}
            members={memberOptions(members)}
            initialPhotoId={searchParams.photo}
            currentMemberId={session?.memberId}
            albumContext={albumContext}
          />
        </section>
      )}
    </div>
  );
}