import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { NewEventModal } from '@/components/new-event-modal';
import { Icon } from '@/components/icons';
import { fullName, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Item = {
  date: Date;
  year: number;
  title: string;
  detail: string;
  kind: 'birth' | 'death' | 'marriage' | 'reunion' | 'event';
  href?: string;
};

export default async function TimelinePage() {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';

  const [members, marriages, reunions, events] = await Promise.all([
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: { id: true, firstName: true, lastName: true, birthDate: true, deathDate: true },
    }),
    prisma.relationship.findMany({
      where: { type: 'SPOUSE', startDate: { not: null }, status: 'ACTIVE' },
      include: { person: { select: { id: true, firstName: true, lastName: true } }, relatedPerson: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.reunionEvent.findMany({ select: { id: true, name: true, date: true, location: true } }),
    prisma.familyEvent.findMany({ select: { id: true, title: true, eventDate: true, description: true, eventType: true } }),
  ]);

  const items: Item[] = [];

  for (const m of members) {
    if (m.birthDate) {
      items.push({
        date: m.birthDate,
        year: m.birthDate.getFullYear(),
        title: `${fullName(m)} was born`,
        detail: '',
        kind: 'birth',
        href: `/family/${m.id}`,
      });
    }
    if (m.deathDate) {
      items.push({
        date: m.deathDate,
        year: m.deathDate.getFullYear(),
        title: `${fullName(m)} passed away`,
        detail: '',
        kind: 'death',
        href: `/family/${m.id}`,
      });
    }
  }
  for (const r of marriages) {
    if (!r.startDate) continue;
    items.push({
      date: r.startDate,
      year: r.startDate.getFullYear(),
      title: `${fullName(r.person)} married ${fullName(r.relatedPerson)}`,
      detail: '',
      kind: 'marriage',
      href: `/family/${r.person.id}`,
    });
  }
  for (const r of reunions) {
    items.push({
      date: r.date,
      year: r.date.getFullYear(),
      title: r.name,
      detail: r.location ? `Reunion · ${r.location}` : 'Family reunion',
      kind: 'reunion',
      href: `/reunions/${r.id}`,
    });
  }
  for (const e of events) {
    items.push({
      date: e.eventDate,
      year: e.eventDate.getFullYear(),
      title: e.title,
      detail: e.description || '',
      kind: 'event',
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  const byYear = new Map<number, Item[]>();
  for (const it of items) {
    const arr = byYear.get(it.year) || [];
    arr.push(it);
    byYear.set(it.year, arr);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const KIND_STYLE: Record<Item['kind'], { icon: string; color: string }> = {
    birth: { icon: 'sparkle', color: 'bg-sage/15 text-sage' },
    death: { icon: 'clock', color: 'bg-ink/10 text-inkSoft' },
    marriage: { icon: 'heart', color: 'bg-rust/10 text-rust' },
    reunion: { icon: 'calendar', color: 'bg-gold/15 text-goldDeep' },
    event: { icon: 'sparkle', color: 'bg-gold/10 text-goldDeep' },
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Timeline</h1>
          <p className="mt-1 text-sm text-inkSoft">{items.length} moments in our family&apos;s history, from births and weddings to reunions.</p>
        </div>
        <NewEventModal isAdmin={isAdmin} />
      </div>

      <div className="space-y-10">
        {years.map((year) => (
          <section key={year}>
            <h2 className="mb-4 flex items-center gap-3">
              <span className="font-display text-2xl font-bold text-goldDeep">{year}</span>
              <span className="h-px flex-1 bg-line" />
            </h2>
            <ul className="relative ml-3 space-y-5 border-l-2 border-line pl-6">
              {byYear.get(year)!.map((it, i) => {
                const s = KIND_STYLE[it.kind];
                return (
                  <li key={`${year}-${i}`} className="relative">
                    <span className={`absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full ${s.color}`}>
                      <Icon name={s.icon} className="h-3.5 w-3.5" />
                    </span>
                    {it.href ? (
                      <Link href={it.href} className="block rounded-xl p-2 -m-2 transition hover:bg-parchment/50">
                        <p className="font-semibold text-ink">{it.title}</p>
                        {it.detail && <p className="text-sm text-inkSoft">{it.detail}</p>}
                        <p className="mt-0.5 text-xs text-inkSoft/70">{formatDate(it.date)}</p>
                      </Link>
                    ) : (
                      <div className="rounded-xl p-2 -m-2">
                        <p className="font-semibold text-ink">{it.title}</p>
                        {it.detail && <p className="text-sm text-inkSoft">{it.detail}</p>}
                        <p className="mt-0.5 text-xs text-inkSoft/70">{formatDate(it.date)}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {years.length === 0 && (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Icon name="clock" className="h-8 w-8 text-inkSoft/40" />
            <p className="text-sm text-inkSoft">No timeline events recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}