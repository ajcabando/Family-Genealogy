'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from './icons';
import { yearsRange, fullName, cn } from '@/lib/utils';

export type DirectoryEntry = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  birthDate?: string | null;
  deathDate?: string | null;
  branch?: string | null;
  occupation?: string | null;
  location?: string | null;
  photo?: { thumbPath?: string | null; optimizedPath?: string | null } | null;
};

export function Directory({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('');
  const [letter, setLetter] = useState('');

  const branches = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) if (e.branch) s.add(e.branch);
    return [...s].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (branch) list = list.filter((e) => e.branch === branch);
    if (letter) list = list.filter((e) => (e.lastName || '')[0].toUpperCase() === letter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((e) =>
        `${e.firstName} ${e.middleName || ''} ${e.lastName} ${e.branch || ''} ${e.occupation || ''} ${e.location || ''}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, query, branch, letter]);

  const letters = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) s.add((e.lastName || '?')[0].toUpperCase());
    return [...s].sort();
  }, [entries]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, branch, occupation…"
            className="input pl-10"
          />
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="input sm:w-52">
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-1">
        <button onClick={() => setLetter('')} className={cn('rounded-lg px-2.5 py-1 text-xs font-bold transition', !letter ? 'bg-goldDeep text-white' : 'text-inkSoft hover:bg-parchment')}>
          All
        </button>
        {letters.map((l) => (
          <button
            key={l}
            onClick={() => setLetter(letter === l ? '' : l)}
            className={cn('rounded-lg px-2.5 py-1 text-xs font-bold transition', letter === l ? 'bg-goldDeep text-white' : 'text-inkSoft hover:bg-parchment')}
          >
            {l}
          </button>
        ))}
      </div>

      <p className="mb-3 text-sm text-inkSoft">{filtered.length} of {entries.length} family members</p>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="users" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No family members match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((e) => (
            <Link key={e.id} href={`/family/${e.id}`} className="card group flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <img
                src={e.photo?.thumbPath ? `/api/files/${e.photo.thumbPath}` : ''}
                alt=""
                onError={(ev) => ((ev.target as HTMLImageElement).style.display = 'none')}
                className={cn('h-14 w-14 rounded-full border-2 border-line object-cover', e.deathDate ? 'grayscale' : 'border-goldLight')}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-ink group-hover:text-goldDeep">{fullName(e)}</p>
                <p className="text-xs text-inkSoft">{yearsRange(e.birthDate, e.deathDate)}</p>
                {(e.branch || e.location) && (
                  <p className="mt-0.5 truncate text-[11px] text-inkSoft/80">
                    {e.branch}{e.branch && e.location ? ' · ' : ''}{e.location}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}