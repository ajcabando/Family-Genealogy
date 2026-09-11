import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/icons';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import { normalizeProfileUpdate } from '@/lib/change-request-fields';

export const dynamic = 'force-dynamic';

const REQUEST_LABEL: Record<string, string> = {
  NEW_MEMBER: 'New Family Member',
  RELATIONSHIP: 'Relationship Change',
  PROFILE_UPDATE: 'Profile Update',
};

const TABS = ['all', 'pending', 'approved', 'rejected'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  all: 'All',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';

function statusOf(status: string): Status {
  if (status === 'NEEDS_INFO') return 'PENDING';
  return (status as Status) || 'PENDING';
}

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'bg-orange-100 text-orange-600' },
  APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-600' },
  NEEDS_INFO: { label: 'Needs info', cls: 'bg-gray-100 text-gray-600' },
};

type Item = {
  id: string;
  kind: 'photo' | 'request';
  title: string;
  detail: string;
  status: Status;
  createdAt: Date;
  href?: string;
};

export default async function ContributionsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const tab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : 'all';

  const [requests, photos] = await Promise.all([
    prisma.changeRequest.findMany({
      where: { submittedById: session.id },
      include: { targetMember: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    session.memberId
      ? prisma.photo.findMany({
          where: { uploadedById: session.memberId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const items: Item[] = [
    ...photos.map<Item>((p) => ({
      id: `p-${p.id}`,
      kind: 'photo',
      title: 'Photo Upload',
      detail: p.caption || 'Family photo',
      status: statusOf(p.approvalStatus),
      createdAt: p.createdAt,
      href: `/photos?photo=${p.id}`,
    })),
    ...requests.map<Item>((r) => {
      const target = r.targetMember ? `${r.targetMember.firstName} ${r.targetMember.lastName}` : 'New member';
      const proposed = r.proposedData as Record<string, unknown> | null;
      let detail = '';
      if (r.requestType === 'PROFILE_UPDATE' && proposed) {
        const { field, value } = normalizeProfileUpdate(proposed);
        detail = `${target} · ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${String(value ?? '')}`;
      } else if (r.requestType === 'RELATIONSHIP') {
        detail = `${target} · relationship change (${String(proposed?.type || '').toLowerCase().replace('_', ' ')})`;
      } else {
        detail = target;
      }
      return {
        id: `r-${r.id}`,
        kind: 'request',
        title: `${REQUEST_LABEL[r.requestType] || r.requestType}`,
        detail,
        status: statusOf(r.status),
        createdAt: r.createdAt,
      };
    }),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const counts: Record<Tab, number> = {
    all: items.length,
    pending: items.filter((i) => i.status === 'PENDING').length,
    approved: items.filter((i) => i.status === 'APPROVED').length,
    rejected: items.filter((i) => i.status === 'REJECTED').length,
  };

  const visible = tab === 'all' ? items : items.filter((i) => i.status === (tab === 'approved' ? 'APPROVED' : tab === 'pending' ? 'PENDING' : 'REJECTED'));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">My Contributions</h1>
        <p className="mt-1 text-sm text-inkSoft">
          Everything you&apos;ve submitted to the family archive — corrections, new members, and photos.
        </p>
      </div>

      {/* Tabs: All | Pending | Approved | Rejected */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Contribution status">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/contributions${t === 'all' ? '' : `?tab=${t}`}`}
            role="tab"
            aria-selected={tab === t}
            className={cn('pill shrink-0', tab === t ? 'pill-active' : 'pill-inactive')}
          >
            {TAB_LABEL[t]}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', tab === t ? 'bg-white/20' : 'bg-parchment text-inkSoft')}>{counts[t]}</span>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="inbox" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">
            {tab === 'all' ? (
              <>Nothing here yet. <Link href="/family" className="font-semibold text-navyAccent hover:underline">Suggest a correction</Link> or upload a photo to get started.</>
            ) : (
              `No ${TAB_LABEL[tab].toLowerCase()} contributions.`
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((it) => {
            const badge = STATUS_BADGE[it.status];
            return (
              <li key={it.id} className="card flex items-center gap-4 p-4">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', it.kind === 'photo' ? 'bg-navyAccent/10 text-navyAccent' : it.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700')}>
                  <Icon name={it.kind === 'photo' ? 'photo' : it.status === 'REJECTED' ? 'x' : 'check'} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  {it.href ? (
                    <Link href={it.href} className="font-display text-sm font-bold text-ink hover:text-navyAccent">{it.title}</Link>
                  ) : (
                    <p className="font-display text-sm font-bold text-ink">{it.title}</p>
                  )}
                  <p className="mt-0.5 truncate text-xs text-inkSoft">{it.detail}</p>
                  <p className="mt-0.5 text-[11px] text-inkSoft/70">{formatRelative(it.createdAt)}{it.createdAt.getFullYear() < 2026 ? ` · ${formatDate(it.createdAt)}` : ''}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide', badge.cls)}>{badge.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}