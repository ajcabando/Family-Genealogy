import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { NewEventModal } from '@/components/new-event-modal';
import { Icon } from '@/components/icons';
import { cn, fullName, formatDate, photoUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Kind = 'birth' | 'death' | 'marriage' | 'reunion' | 'event';
type Filter = 'all' | 'birth' | 'marriage' | 'reunion' | 'event';

type Item = {
  date: Date;
  year: number;
  title: string;
  detail: string;
  kind: Kind;
  href?: string;
  thumb?: string | null;
};

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All Events' },
  { key: 'birth', label: 'Births' },
  { key: 'marriage', label: 'Marriages' },
  { key: 'reunion', label: 'Reunions' },
  { key: 'event', label: 'Milestones' },
];

const KIND_STYLE: Record<Kind, { icon: string; color: string }> = {
  birth: { icon: 'sparkle', color: 'bg-sage/15 text-sage' },
  death: { icon: 'clock', color: 'bg-ink/10 text-inkSoft' },
  marriage: { icon: 'heart', color: 'bg-rust/10 text-rust' },
  reunion: { icon: 'calendar', color: 'bg-gold/15 text-goldDeep' },
  event: { icon: 'sparkle', color: 'bg-gold/10 text-goldDeep' },
};

export default async function TimelinePage({ searchParams }: { searchParams: { kind?: string } }) {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';
  const filter: Filter = FILTERS.some((f) => f.key === searchParams.kind) ? (searchParams.kind as Filter) : 'all';

  const [members, marriages, reunions, events] = await Promise.all([
    prisma.familyMember.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        birthPlace: true,
        deathDate: true,
        profilePhoto: { select: { thumbPath: true, optimizedPath: true } },
      },
    }),
    prisma.relationship.findMany({
      where: { type: 'SPOUSE', startDate: { not: null }, status: 'ACTIVE' },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, profilePhoto: { select: { thumbPath: true, optimizedPath: true } } } },
        relatedPerson: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.reunionEvent.findMany({
      select: { id: true, name: true, date: true, location: true, coverPhoto: { select: { thumbPath: true, optimizedPath: true } } },
    }),
    prisma.familyEvent.findMany({ select: { id: true, title: true, eventDate: true, description: true, eventType: true } }),
  ]);

  const items: Item[] = [];

  for (const m of members) {
    if (m.birthDate) {
      items.push({
        date: m.birthDate,
        year: m.birthDate.getFullYear(),
        title: `${fullName(m)} was born`,
        detail: m.birthPlace ? `${formatDate(m.birthDate)} • ${m.birthPlace}` : formatDate(m.birthDate),
        kind: 'birth',
        href: `/family/${m.id}`,
        thumb: photoUrl(m.profilePhoto) || null,
      });
    }
    if (m.deathDate) {
      items.push({
        date: m.deathDate,
        year: m.deathDate.getFullYear(),
        title: `${fullName(m)} passed away`,
        detail: formatDate(m.deathDate),
        kind: 'death',
        href: `/family/${m.id}`,
        thumb: photoUrl(m.profilePhoto) || null,
      });
    }
  }
  for (const r of marriages) {
    if (!r.startDate) continue;
    items.push({
      date: r.startDate,
      year: r.startDate.getFullYear(),
      title: `${fullName(r.person)} married ${fullName(r.relatedPerson)}`,
      detail: formatDate(r.startDate),
      kind: 'marriage',
      href: `/family/${r.person.id}`,
      thumb: photoUrl(r.person.profilePhoto) || null,
    });
  }
  for (const r of reunions) {
    items.push({
      date: r.date,
      year: r.date.getFullYear(),
      title: r.name,
      detail: r.location ? `${formatDate(r.date)} • ${r.location}` : formatDate(r.date),
      kind: 'reunion',
      href: `/reunions/${r.id}`,
      thumb: r.coverPhoto ? photoUrl(r.coverPhoto, 'full') : null,
    });
  }
  for (const e of events) {
    items.push({
      date: e.eventDate,
      year: e.eventDate.getFullYear(),
      title: e.title,
      detail: e.description || formatDate(e.eventDate),
      kind: 'event',
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  const filtered = filter === 'all' ? items : items.filter((it) => it.kind === filter);

  const byYear = new Map<number, Item[]>();
  for (const it of filtered) {
    const arr = byYear.get(it.year) || [];
    arr.push(it);
    byYear.set(it.year, arr);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Timeline</h1>
          <p className="mt-1 text-sm text-inkSoft">{filtered.length} moments in our family&apos;s history, from births and weddings to reunions.</p>
        </div>
        <NewEventModal isAdmin={isAdmin} />
      </div>

      {/* Filter pills */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/timeline${f.key === 'all' ? '' : `?kind=${f.key}`}`}
            className={cn('pill shrink-0', filter === f.key ? 'pill-active' : 'pill-inactive')}
            aria-current={filter === f.key ? 'page' : undefined}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {years.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="clock" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No timeline events recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {years.map((year) => (
            <section key={year}>
              <h2 className="mb-4 flex items-center gap-3">
                <span className="font-display text-2xl font-bold text-navyAccent">{year}</span>
                <span className="h-px flex-1 bg-line" />
              </h2>
              <ul className="relative ml-3 space-y-4 border-l-2 border-line pl-6">
                {byYear.get(year)!.map((it, i) => {
                  const s = KIND_STYLE[it.kind];
                  return (
                    <li key={`${year}-${i}`} className="relative">
                      <span className={cn('absolute -left-[31px] top-4 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-[#f4f6fa]', s.color)}>
                        <Icon name={s.icon} className="h-3.5 w-3.5" />
                      </span>
                      <div className="card flex items-center gap-4 p-4 transition hover:shadow-lift">
                        <div className="min-w-0 flex-1">
                          {it.href ? (
                            <Link href={it.href} className="hover:underline">
                              <p className="font-display text-sm font-bold text-ink">{it.title}</p>
                            </Link>
                          ) : (
                            <p className="font-display text-sm font-bold text-ink">{it.title}</p>
                          )}
                          {it.detail && <p className="mt-0.5 text-xs text-inkSoft">{it.detail}</p>}
                        </div>
                        {it.thumb && (
                          <img src={it.thumb} alt="" loading="lazy" className="h-14 w-16 shrink-0 rounded-xl border border-line/60 object-cover" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}