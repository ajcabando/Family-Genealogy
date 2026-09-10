import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/icons';
import { cn, formatDate, formatRelative, photoUrl, plural } from '@/lib/utils';

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

const TABS = ['pending', 'approved', 'rejected'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default async function ContributionsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const tab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : 'pending';

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

  const statusOf = (r: { status: string }) => (r.status === 'PENDING' ? 'pending' : r.status === 'APPROVED' ? 'approved' : 'rejected');
  const pendingPhotos = photos.filter((p) => p.approvalStatus === 'PENDING');
  const approvedPhotos = photos.filter((p) => p.approvalStatus === 'APPROVED');
  const rejectedPhotos = photos.filter((p) => p.approvalStatus === 'REJECTED');
  const photoCounts: Record<Tab, number> = {
    pending: pendingPhotos.length,
    approved: approvedPhotos.length,
    rejected: rejectedPhotos.length,
  };
  const requestCounts: Record<Tab, number> = {
    pending: requests.filter((r) => statusOf(r) === 'pending').length,
    approved: requests.filter((r) => statusOf(r) === 'approved').length,
    rejected: requests.filter((r) => statusOf(r) === 'rejected').length,
  };
  const totalByTab: Record<Tab, number> = {
    pending: requestCounts.pending + photoCounts.pending,
    approved: requestCounts.approved + photoCounts.approved,
    rejected: requestCounts.rejected + photoCounts.rejected,
  };
  const tabRequests = requests.filter((r) => statusOf(r) === tab);
  const tabPhotos = tab === 'pending' ? pendingPhotos : tab === 'approved' ? approvedPhotos : rejectedPhotos;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">My Contributions</h1>
        <p className="mt-1 text-sm text-inkSoft">
          Everything you&apos;ve submitted to the family archive — corrections, new members, and photos.
        </p>
      </div>

      {/* Tabs: Pending | Approved | Rejected */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Contribution status">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Link
              key={t}
              href={`/contributions?tab=${t}`}
              role="tab"
              aria-selected={active}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition',
                active ? 'bg-goldDeep text-white shadow-card' : 'border border-line bg-white text-inkSoft hover:text-goldDeep',
              )}
            >
              {TAB_LABEL[t]}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', active ? 'bg-white/20' : 'bg-parchment')}>{totalByTab[t]}</span>
            </Link>
          );
        })}
      </div>

      {tab === 'pending' && totalByTab.pending === 0 && (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Icon name="inbox" className="h-7 w-7 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">
            Nothing pending.{' '}
            <Link href="/family" className="font-semibold text-goldDeep hover:text-gold">Suggest a correction</Link> or upload a photo to get started.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">
          Change requests <span className="text-sm font-normal text-inkSoft">({tabRequests.length})</span>
        </h2>
        {tabRequests.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <Icon name="inbox" className="h-7 w-7 text-inkSoft/40" />
            <p className="text-sm text-inkSoft">No {TAB_LABEL[tab].toLowerCase()} change requests.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tabRequests.map((r) => {
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
        <h2 className="mb-3 font-display text-lg font-bold text-ink">My photos <span className="text-sm font-normal text-inkSoft">({tabPhotos.length})</span></h2>
        {tabPhotos.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <Icon name="camera" className="h-7 w-7 text-inkSoft/40" />
            <p className="text-sm text-inkSoft">No {TAB_LABEL[tab].toLowerCase()} photos.</p>
          </div>
        ) : (
          <PhotoRow title={`${TAB_LABEL[tab]} photos (${tabPhotos.length})`} photos={tabPhotos} />
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