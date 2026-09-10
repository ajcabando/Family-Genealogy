'use client';

import Link from 'next/link';
import { Icon } from '../icons';
import { yearsRange, fullName } from '@/lib/utils';
import type { TreePerson } from '@/lib/genealogy';

export type DrawerRel = { id: string; name: string };

export function ProfileDrawer({
  person,
  parents,
  children,
  spouses,
  siblings,
  onFocus,
  onClose,
}: {
  person: TreePerson;
  parents: DrawerRel[];
  children: DrawerRel[];
  spouses: DrawerRel[];
  siblings: DrawerRel[];
  onFocus: (id: string) => void;
  onClose: () => void;
}) {
  const years = yearsRange(
    person.birthYear ? new Date(person.birthYear, 0).toISOString() : null,
    person.deathYear ? new Date(person.deathYear, 0).toISOString() : null,
  );

  const RelChips = ({ label, items }: { label: string; items: DrawerRel[] }) =>
    items.length > 0 ? (
      <div>
        <p className="label">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => onFocus(r.id)}
              className="rounded-full border border-line bg-cream px-2.5 py-1 text-xs font-semibold text-inkSoft transition hover:border-gold hover:text-goldDeep"
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 animate-fade-in" onClick={onClose}>
      <aside
        className="h-full w-full max-w-sm overflow-y-auto border-l border-line/60 bg-white p-6 shadow-lift animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="badge-neutral">{person.deceased ? 'Deceased' : 'Living'}</p>
            {person.branch && <p className="badge-gold mt-2">{person.branch}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-inkSoft transition hover:bg-parchment" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          {person.thumbUrl ? (
            <img
              src={person.thumbUrl}
              alt={person.firstName}
              className={`h-24 w-24 rounded-full border-4 object-cover shadow-card ${person.deceased ? 'border-line grayscale' : 'border-goldLight'}`}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold/15 font-display text-2xl font-bold text-goldDeep">
              {(person.firstName || '?')[0]}
            </div>
          )}
          <h2 className="mt-3 font-display text-2xl font-bold text-ink">
            {person.firstName} {person.lastName}
          </h2>
          {years && <p className="text-sm text-inkSoft">{years}</p>}
          {person.occupation && <p className="mt-1 text-sm text-inkSoft">{person.occupation}</p>}
          {person.location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-inkSoft/80">
              <Icon name="mapPin" className="h-3.5 w-3.5" /> {person.location}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <RelChips label="Parents" items={parents} />
          <RelChips label="Spouses" items={spouses} />
          <RelChips label="Children" items={children} />
          <RelChips label="Siblings" items={siblings} />
        </div>

        <div className="mt-6 space-y-2">
          <Link href={`/family/${person.id}`} className="btn-primary w-full">
            View full profile
          </Link>
          <Link href={`/family/${person.id}?suggest=1`} className="btn-ghost w-full">
            Suggest a correction
          </Link>
        </div>
      </aside>
    </div>
  );
}