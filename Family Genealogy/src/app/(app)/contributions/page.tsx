import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/icons';
import { formatDate, formatRelative, photoUrl, plural } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const REQUEST_LABEL: Record<string, string> = {
  NEW_MEMBER: 'New family member',
  RELATIONSHIP: 'Relationship change',
  PROFILE_UPDATE: 'Profile update',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-gold',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  NEEDS_INFO: 'badge-neutral',
};

export default async function ContributionsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [requests, photos] = await Promise.all([
    prisma.changeRequest.findMany({
      where: { submittedById: session.id },
      include: { reviewedBy: { select: { email: true, familyMember: { select: { firstName: true, lastName: true } } } }, targetMember: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    session.memberId
      ? prisma.photo.findMany({
          where: { uploadedById: session.memberId },
          include: { tags: { include: { member: { select: { id: true, firstName: true, lastName: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const pendingPhotos = photos.filter((p) => p.approvalStatus === 'PENDING');
  const approvedPhotos = photos.filter((p) => p.approvalStatus === 'APPROVED');
  const rejectedPhotos = photos.filter((p) => p.approvalStatus === 'REJECTED');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">My Contributions</h1>
        <p className="mt-1 text-sm text-inkSoft">
          Everything you&apos;ve submitted to the family archive — corrections, new members, and photos.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">
          Change requests <span className="text-sm font-normal text-inkSoft">({requests.length})</span>
        </h2>
        {requests.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <Icon name="inbox" className="h-7 w-7 text-inkSoft/40" />
            <p className="text-sm text-inkSoft">
              You haven&apos;t submitted any changes yet.{' '}
              <Link href="/family" className="font-semibold text-goldDeep hover:text-gold">Suggest a correction</Link> from any profile.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => {
              const proposed = r.proposedData as Record<string, unknown> | null;
              const target = r.targetMember ? `${r.targetMember.firstName} ${r.targetMember.lastName}` : 'New member';
              return (
                <li key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink">
                        {REQUEST_LABEL[r.requestType] || r.requestType}
                        {r.targetType !== 'new_member' && target !== 'New member' ? ` — ${target}` : ''}
                      </p>
                      <span className={STATUS_BADGE[r.status]}>{r.status.replace('_', ' ').toLowerCase()}</span>
                    </div>
                    <span className="text-xs text-inkSoft">{formatRelative(r.createdAt)}</span>
                  </div>
                  {r.requestType === 'PROFILE_UPDATE' && proposed && (
                    <p className="mt-2 text-sm text-inkSoft">
                      <span className="font-semibold text-ink">{(proposed.field as string)?.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span> {String(proposed.value)}
                    </p>
                  )}
                  {r.requestType === 'RELATIONSHIP' && proposed && (
                    <p className="mt-2 text-sm text-inkSoft">Relationship change requested ({String(proposed.type)?.toLowerCase().replace('_', ' ')})</p>
                  )}
                  {r.reason && <p className="mt-1 text-sm italic text-inkSoft/80">“{r.reason}”</p>}
                  {r.reviewNotes && (
                    <p className="mt-2 rounded-lg bg-parchment/60 px-3 py-2 text-xs text-inkSoft">
                      <span className="font-semibold">Reviewer:</span> {r.reviewNotes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">My photos <span className="text-sm font-normal text-inkSoft">({photos.length})</span></h2>
        {photos.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <Icon name="camera" className="h-7 w-7 text-inkSoft/40" />
            <p className="text-sm text-inkSoft">Upload your first photo from the <Link href="/photos" className="font-semibold text-goldDeep hover:text-gold">Photo archive</Link>.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPhotos.length > 0 && (
              <PhotoRow title={`Pending review (${pendingPhotos.length})`} photos={pendingPhotos} />
            )}
            {approvedPhotos.length > 0 && <PhotoRow title={`Published (${approvedPhotos.length})`} photos={approvedPhotos} />}
            {rejectedPhotos.length > 0 && <PhotoRow title={`Not approved (${rejectedPhotos.length})`} photos={rejectedPhotos} />}
          </div>
        )}
      </section>
    </div>
  );
}

function PhotoRow({ title, photos }: { title: string; photos: Array<{ id: string; caption: string | null; photoDate: Date | null; thumbPath: string; optimizedPath: string | null; approvalStatus: string }> }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-inkSoft">{title}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
        {photos.map((p) => (
          <Link
            key={p.id}
            href={`/photos?photo=${p.id}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-line/60"
            title={p.caption || undefined}
          >
            <img src={photoUrl(p, 'full')} alt={p.caption || 'Photo'} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            {p.approvalStatus === 'PENDING' && (
              <span className="absolute inset-x-0 bottom-0 bg-gold/85 px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">pending</span>
            )}
            {p.approvalStatus === 'REJECTED' && (
              <span className="absolute inset-x-0 bottom-0 bg-rust/85 px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">rejected</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}