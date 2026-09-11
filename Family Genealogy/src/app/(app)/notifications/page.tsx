import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { MarkAllRead } from '@/components/mark-all-read';
import { Icon } from '@/components/icons';
import { formatRelative, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Filter = 'all' | 'unread' | 'mentions' | 'updates';
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'updates', label: 'Updates' },
];

const MENTION_TYPES = new Set(['TAG', 'COMMENT']);

function iconFor(type: string): { name: string; cls: string } {
  switch (type) {
    case 'TAG': return { name: 'user', cls: 'bg-purple-100 text-purple-600' };
    case 'COMMENT': return { name: 'edit', cls: 'bg-blue-100 text-blue-600' };
    case 'APPROVAL_RESULT':
    case 'PHOTO_APPROVAL': return { name: 'check', cls: 'bg-green-100 text-green-700' };
    case 'NEW_REUNION': return { name: 'calendar', cls: 'bg-orange-100 text-orange-600' };
    case 'NEW_MEMBER': return { name: 'userPlus', cls: 'bg-green-100 text-green-700' };
    case 'TREE_UPDATE': return { name: 'tree', cls: 'bg-blue-100 text-blue-600' };
    case 'REQUEST': return { name: 'shield', cls: 'bg-orange-100 text-orange-600' };
    default: return { name: 'bell', cls: 'bg-gray-100 text-gray-600' };
  }
}

export default async function NotificationsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const filter: Filter = searchParams.filter === 'unread' ? 'unread' : searchParams.filter === 'mentions' ? 'mentions' : searchParams.filter === 'updates' ? 'updates' : 'all';

  const [allItems, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.notification.count({ where: { userId: session.id, readAt: null } }),
  ]);

  const items = allItems.filter((n) => {
    if (filter === 'unread') return !n.readAt;
    if (filter === 'mentions') return MENTION_TYPES.has(n.type);
    if (filter === 'updates') return !MENTION_TYPES.has(n.type);
    return true;
  });

  const counts: Record<Filter, number> = {
    all: allItems.length,
    unread,
    mentions: allItems.filter((n) => MENTION_TYPES.has(n.type)).length,
    updates: allItems.filter((n) => !MENTION_TYPES.has(n.type)).length,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-inkSoft">{unread} unread</p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </div>

      {/* Filter pills */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/notifications${f.key === 'all' ? '' : `?filter=${f.key}`}`}
            className={cn('pill shrink-0', filter === f.key ? 'pill-active' : 'pill-inactive')}
            aria-current={filter === f.key ? 'page' : undefined}
          >
            {f.label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', filter === f.key ? 'bg-white/20' : 'bg-parchment text-inkSoft')}>{counts[f.key]}</span>
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="bell" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No notifications here. Activity from the family will show up in this list.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const ic = iconFor(n.type);
            const inner = (
              <div className={cn('flex items-start gap-3 rounded-2xl border p-4 transition hover:shadow-card', n.readAt ? 'border-line/60 bg-white' : 'border-navyAccent/30 bg-navyAccent/5')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', ic.cls)}>
                  <Icon name={ic.name} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-inkSoft">{n.body}</p>}
                  <p className="mt-1 text-xs text-inkSoft/70">{formatRelative(n.createdAt)}</p>
                </div>
                {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-navyAccent" />}
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? <Link href={n.link}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}