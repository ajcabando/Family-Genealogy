import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { MarkAllRead } from '@/components/mark-all-read';
import { Icon } from '@/components/icons';
import { formatRelative, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.notification.count({ where: { userId: session.id, readAt: null } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-inkSoft">{unread} unread</p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="bell" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No notifications yet. Activity from the family will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} className={cn('flex gap-3 rounded-2xl border p-4 transition hover:shadow-card', n.readAt ? 'border-line/60 bg-white' : 'border-gold/40 bg-gold/5')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-line' : 'bg-gold')} />
                  <div>
                    <p className="text-sm font-bold text-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-inkSoft">{n.body}</p>}
                    <p className="mt-1 text-xs text-inkSoft/70">{formatRelative(n.createdAt)}</p>
                  </div>
                </Link>
              ) : (
                <div className={cn('flex gap-3 rounded-2xl border p-4', n.readAt ? 'border-line/60 bg-white' : 'border-gold/40 bg-gold/5')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-line' : 'bg-gold')} />
                  <div>
                    <p className="text-sm font-bold text-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-inkSoft">{n.body}</p>}
                    <p className="mt-1 text-xs text-inkSoft/70">{formatRelative(n.createdAt)}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}