'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type MemberOption = { id: string; name: string };

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition',
        active
          ? 'bg-navyAccent text-white shadow-card'
          : 'border border-line bg-white text-inkSoft hover:text-navyAccent',
      )}
    >
      {children}
    </button>
  );
}

export function PhotosFilterBar({
  members,
  locations,
}: {
  members: MemberOption[];
  locations: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const person = params.get('person');
  const location = params.get('location');
  const favorites = params.get('favorites') === '1';
  const view = params.get('view');
  const sort = params.get('sort') || 'newest';
  const viewMode = params.get('viewmode');

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  function push(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const activeChip = favorites ? 'favorites' : person ? 'people' : location ? 'locations' : view === 'albums' ? 'albums' : 'all';
  const personName = members.find((m) => m.id === person)?.name;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/60 bg-white px-3.5 py-2.5 shadow-card">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={activeChip === 'all'} onClick={() => push({ person: null, location: null, favorites: null, view: null })}>
          <Icon name="inbox" className="h-3.5 w-3.5" /> All Photos
        </Chip>
        <Chip active={activeChip === 'albums'} onClick={() => push({ person: null, location: null, favorites: null, view: 'albums' })}>
          <Icon name="book" className="h-3.5 w-3.5" /> Albums
        </Chip>

        {/* People dropdown */}
        <div className="relative">
          <Chip active={activeChip === 'people'} onClick={() => setPeopleOpen((o) => !o)}>
            <Icon name="user" className="h-3.5 w-3.5" /> {personName || 'People'}
            <Icon name="chevronRight" className="h-3 w-3 -rotate-90" />
          </Chip>
          {peopleOpen && (
            <div className="absolute left-0 top-full z-20 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-xl border border-line/60 bg-white p-1 shadow-lift">
              <button
                onClick={() => { push({ person: null }); setPeopleOpen(false); }}
                className={cn('w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-parchment/60', !person && 'bg-navyAccent/10 font-semibold text-navyAccent')}
              >
                Everyone
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { push({ person: m.id, view: null }); setPeopleOpen(false); }}
                  className={cn('w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-parchment/60', person === m.id && 'bg-navyAccent/10 font-semibold text-navyAccent')}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Locations dropdown */}
        <div className="relative">
          <Chip active={activeChip === 'locations'} onClick={() => setLocationOpen((o) => !o)}>
            <Icon name="mapPin" className="h-3.5 w-3.5" /> {location || 'Locations'}
            <Icon name="chevronRight" className="h-3 w-3 -rotate-90" />
          </Chip>
          {locationOpen && (
            <div className="absolute left-0 top-full z-20 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-xl border border-line/60 bg-white p-1 shadow-lift">
              <button
                onClick={() => { push({ location: null }); setLocationOpen(false); }}
                className={cn('w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-parchment/60', !location && 'bg-navyAccent/10 font-semibold text-navyAccent')}
              >
                All locations
              </button>
              {locations.map((l) => (
                <button
                  key={l}
                  onClick={() => { push({ location: l, view: null }); setLocationOpen(false); }}
                  className={cn('w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-parchment/60', location === l && 'bg-navyAccent/10 font-semibold text-navyAccent')}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <Chip active={activeChip === 'favorites'} onClick={() => push({ favorites: favorites ? null : '1', view: null })}>
          <Icon name="heart" className="h-3.5 w-3.5" /> Favorites
        </Chip>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-xl border border-line bg-white p-0.5">
          <button
            onClick={() => push({ viewmode: null })}
            className={cn('flex h-8 w-9 items-center justify-center rounded-lg transition', viewMode !== 'list' ? 'bg-navyAccent text-white' : 'text-inkSoft hover:text-navyAccent')}
            title="Grid view"
          >
            <Icon name="grid" className="h-4 w-4" />
          </button>
          <button
            onClick={() => push({ viewmode: 'list' })}
            className={cn('flex h-8 w-9 items-center justify-center rounded-lg transition', viewMode === 'list' ? 'bg-navyAccent text-white' : 'text-inkSoft hover:text-navyAccent')}
            title="List view"
          >
            <Icon name="list" className="h-4 w-4" />
          </button>
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-inkSoft transition hover:text-navyAccent"
          >
            {sort === 'oldest' ? 'Oldest First' : 'Newest First'}
            <Icon name="chevronRight" className={cn('h-3.5 w-3.5 transition', sortOpen && 'rotate-90')} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-40 rounded-xl border border-line/60 bg-white p-1 shadow-lift">
              <button
                onClick={() => { push({ sort: 'newest' }); setSortOpen(false); }}
                className={cn('w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-parchment/60', sort === 'newest' && 'bg-navyAccent/10 font-semibold text-navyAccent')}
              >
                Newest First
              </button>
              <button
                onClick={() => { push({ sort: 'oldest' }); setSortOpen(false); }}
                className={cn('w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-parchment/60', sort === 'oldest' && 'bg-navyAccent/10 font-semibold text-navyAccent')}
              >
                Oldest First
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}