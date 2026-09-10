import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { PHOTO_INCLUDE, serializePhoto } from '@/lib/photo-shared';
import { PhotoGallery } from '@/components/photo-gallery';
import { UploadButton } from '@/components/upload-button';
import { memberOptions } from '@/lib/members';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

export default async function PhotosPage({ searchParams }: { searchParams: { photo?: string; person?: string } }) {
  const session = await getSession();
  const settings = await getSettings();
  const approvalRequired = settings.photoApprovalRequired === 'true';

  const personFilter = searchParams.person;
  const where = {
    approvalStatus: 'APPROVED' as const,
    deletedAt: null,
    ...(personFilter ? { tags: { some: { memberId: personFilter } } } : {}),
  };

  const [photos, total, members] = await Promise.all([
    prisma.photo.findMany({ where, include: PHOTO_INCLUDE, orderBy: { createdAt: 'desc' }, take: PAGE_SIZE }),
    prisma.photo.count({ where }),
    prisma.familyMember.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] }),
  ]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Photos</h1>
          <p className="mt-1 text-sm text-inkSoft">
            {total} approved {total === 1 ? 'photo' : 'photos'} in the archive
            {personFilter ? ' — filtered by tagged member' : ''}
            {approvalRequired ? ' · new uploads are reviewed before publishing' : ''}
          </p>
        </div>
        <UploadButton members={memberOptions(members)} approvalRequired={approvalRequired} />
      </div>

      <PhotoGallery
        initialPhotos={photos.map(serializePhoto)}
        total={total}
        personId={personFilter}
        canDownload={settings.allowPhotoDownload === 'true'}
        members={memberOptions(members)}
        initialPhotoId={searchParams.photo}
      />
    </div>
  );
}