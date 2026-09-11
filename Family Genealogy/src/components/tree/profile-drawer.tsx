'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../icons';
import { cn } from '@/lib/utils';
import type { TreePerson } from '@/lib/genealogy';

export type DrawerRel = { id: string; name: string; years?: string; thumb?: string };

function genderGlyph(gender: string) {
  if (gender === 'MALE') return '♂';
  if (gender === 'FEMALE') return '♀';
  return '';
}

const TABS = ['Overview', 'Family', 'Photos', 'Timeline'] as const;

export function ProfileDrawer({
  person,
  parents,
  children,
  spouses,
  siblings,
  onFocus,
  onClose,
  focusLabel,
  onFocusToggle,
}: {
  person: TreePerson;
  parents: DrawerRel[];
  children: DrawerRel[];
  spouses: DrawerRel[];
  siblings: DrawerRel[];
  onFocus: (id: string) => void;
  onClose: () => void;
  focusLabel?: string;
  onFocusToggle?: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  const living = !person.deceased;
  const age = person.birthYear && living ? new Date().getFullYear() - person.birthYear : null;
  const yearsLine = person.deceased
    ? `${person.birthYear ?? '?'} – ${person.deathYear ?? '?'}`
    : person.birthYear
      ? `b. ${person.birthYear}${age ? ` (Age ${age})` : ''}`
      : '';

  const birthDate = person.birthDate
    ? new Date(person.birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : person.birthYear
      ? String(person.birthYear)
      : null;

  const infoRows: Array<{ label: string; value: string | null }> = [
    { label: 'Full Name', value: [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') },
    { label: 'Nickname', value: person.nickname || null },
    { label: 'Birth Date', value: birthDate },
    { label: 'Birth Place', value: person.birthPlace || null },
    { label: 'Occupation', value: person.occupation || null },
    { label: 'Current Location', value: person.location || null },
  ];

  const RelRow = ({ rels, onPick, showYears = true }: { rels: DrawerRel[]; onPick?: (id: string) => void; showYears?: boolean }) => (
    <div className="flex flex-wrap gap-1.5">
      {rels.map((r) => (
        <button
          key={r.id}
          onClick={() => onPick?.(r.id)}
          className="flex items-center gap-2 rounded-xl border border-line/60 bg-white px-2 py-1.5 text-left transition hover:border-navyAccent/50 hover:bg-navyAccent/5"
        >
          {r.thumb ? (
            <img src={r.thumb} alt={r.name} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-parchment text-[10px] font-bold text-inkSoft">
              {(r.name || '?')[0]}
            </span>
          )}
          <span className="text-xs font-semibold text-ink">
            {r.name}
            {showYears && r.years && <span className="ml-1 font-normal text-inkSoft">{r.years}</span>}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-ink/30 animate-fade-in" onClick={onClose}>
      <aside
        className="flex h-full w-full flex-col overflow-hidden bg-white shadow-lift animate-fade-up sm:w-[400px] sm:rounded-l-3xl sm:border-l sm:border-line/60"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${person.firstName} ${person.lastName} — profile`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', living ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', living ? 'bg-green-600' : 'bg-gray-400')} />
              {living ? 'Living' : 'Deceased'}
            </span>
            {person.branch && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                {person.branch}
              </span>
            )}
            {children.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                {children.length} Children
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-inkSoft transition hover:bg-parchment" aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Identity */}
          <div className="px-5 pt-5">
            <div className="flex items-start gap-4">
              {person.thumbUrl ? (
                <img
                  src={person.thumbUrl}
                  alt={person.firstName}
                  className={cn('h-20 w-20 rounded-full border-4 object-cover shadow-card', living ? 'border-green-200' : 'border-line grayscale')}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 font-display text-2xl font-bold text-goldDeep">
                  {(person.firstName || '?')[0]}
                </div>
              )}
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink">
                  {person.firstName} {person.lastName}{' '}
                  {genderGlyph(person.gender) && <span className="text-base text-inkSoft">{genderGlyph(person.gender)}</span>}
                </h2>
                {yearsLine && <p className="mt-0.5 text-sm text-inkSoft">{yearsLine}</p>}
                {person.location && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-inkSoft/80">
                    <Icon name="mapPin" className="h-3.5 w-3.5" /> {person.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5 flex items-center gap-5 border-b border-line/60 px-5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'relative pb-2.5 text-sm font-semibold transition',
                  tab === t ? 'text-navyAccent' : 'text-inkSoft hover:text-ink',
                )}
              >
                {t}
                {tab === t && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-navyAccent" />}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="space-y-6 px-5 py-5">
              {/* Basic information */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-ink">Basic Information</h3>
                  <Link
                    href={`/family/${person.id}?suggest=1`}
                    className="flex items-center gap-1 rounded-full border border-navyAccent/30 px-2.5 py-1 text-[10px] font-bold text-navyAccent transition hover:bg-navyAccent/10"
                  >
                    <Icon name="edit" className="h-3 w-3" /> Edit (Request)
                  </Link>
                </div>
                <dl className="divide-y divide-line/60 rounded-2xl border border-line/60 bg-cream/60">
                  {infoRows.filter((r) => r.value).map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <dt className="shrink-0 text-xs font-semibold text-inkSoft">{r.label}</dt>
                      <dd className="text-right text-sm text-ink">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Family connections */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-ink">Family Connections</h3>
                  <Link href={`/family/${person.id}`} className="text-[11px] font-semibold text-navyAccent hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-3.5">
                  {parents.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Parents</p>
                      <RelRow rels={parents} onPick={onFocus} />
                    </div>
                  )}
                  {spouses.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Spouse</p>
                      <RelRow rels={spouses} onPick={onFocus} />
                    </div>
                  )}
                  {children.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Children</p>
                      <RelRow rels={children} onPick={onFocus} />
                    </div>
                  )}
                  {siblings.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Siblings</p>
                      <button
                        onClick={() => siblings[0] && onFocus(siblings[0].id)}
                        className="flex items-center gap-2 rounded-xl border border-line/60 bg-white px-2 py-1.5 text-left transition hover:border-navyAccent/50 hover:bg-navyAccent/5"
                      >
                        <span className="flex -space-x-1.5">
                          {siblings.slice(0, 3).map((s) => (
                            s.thumb ? (
                              <img key={s.id} src={s.thumb} alt="" className="h-6 w-6 rounded-full border-2 border-white object-cover" />
                            ) : (
                              <span key={s.id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-parchment text-[10px] font-bold text-inkSoft">
                                {(s.name || '?')[0]}
                              </span>
                            )
                          ))}
                        </span>
                        <span className="text-xs font-semibold text-ink">{siblings.length} sibling{siblings.length === 1 ? '' : 's'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {tab === 'Family' && (
            <div className="space-y-4 px-5 py-5">
              {parents.length === 0 && spouses.length === 0 && children.length === 0 && siblings.length === 0 ? (
                <p className="text-sm text-inkSoft">No family connections recorded yet.</p>
              ) : (
                <>
                  {parents.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Parents</p>
                      <RelRow rels={parents} onPick={onFocus} />
                    </div>
                  )}
                  {spouses.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Spouse</p>
                      <RelRow rels={spouses} onPick={onFocus} />
                    </div>
                  )}
                  {children.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Children</p>
                      <RelRow rels={children} onPick={onFocus} />
                    </div>
                  )}
                  {siblings.length > 0 && (
                    <div>
                      <p className="label !mb-1.5">Siblings</p>
                      <RelRow rels={siblings} onPick={onFocus} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'Photos' && (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <Icon name="photo" className="h-8 w-8 text-inkSoft/40" />
              <p className="text-sm text-inkSoft">No photos for {person.firstName} yet.</p>
              <Link href={`/photos?person=${person.id}`} className="mt-1 text-xs font-semibold text-navyAccent hover:underline">
                Browse all photos
              </Link>
            </div>
          )}

          {tab === 'Timeline' && (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <Icon name="clock" className="h-8 w-8 text-inkSoft/40" />
              <p className="text-sm text-inkSoft">Timeline events for {person.firstName} will appear here.</p>
              <Link href="/timeline" className="mt-1 text-xs font-semibold text-navyAccent hover:underline">
                View family timeline
              </Link>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="space-y-2 border-t border-line/60 bg-white p-4">
          <Link href={`/family/${person.id}`} className="btn-primary w-full">
            <Icon name="user" className="h-4 w-4" />
            View Full Profile
          </Link>
          {onFocusToggle && (
            <button
              onClick={onFocusToggle}
              className={cn('btn w-full', focusLabel?.startsWith('In focus') ? 'btn-gold' : 'bg-navyAccent/10 text-navyAccent hover:bg-navyAccent/20')}
            >
              <Icon name="target" className="h-4 w-4" />
              {focusLabel?.startsWith('In focus') ? 'Exit focus view' : focusLabel || 'Focus on this person'}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}