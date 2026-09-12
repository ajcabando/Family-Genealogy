import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { PHOTO_INCLUDE, serializePhoto } from '@/lib/photo-shared';
import { ApprovalQueue } from '@/components/admin/approval-queue';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const [requests, photos, members] = await Promise.all([
    prisma.changeRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        submittedBy: { select: { email: true, familyMember: { select: { firstName: true, lastName: true } } } },
        targetMember: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.photo.findMany({
      where: { approvalStatus: 'PENDING', deletedAt: null },
      include: PHOTO_INCLUDE,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Pending Approvals</h1>
        <p className="mt-1 text-sm text-inkSoft">
          {requests.length} change request{requests.length === 1 ? '' : 's'} and {photos.length} photo{photos.length === 1 ? '' : 's'} awaiting review.
          Approved changes update the official family tree.
        </p>
      </div>
      <ApprovalQueue requests={requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} photos={photos.map(serializePhoto)} members={members} />
    </div>
  );
}