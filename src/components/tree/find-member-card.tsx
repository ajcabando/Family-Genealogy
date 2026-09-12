'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

export type FindMemberOption = {
  id: string;
  name: string;
  years?: string;
  branch?: string;
  generation?: number;
};

export function FindMemberCard({
  members,
  branches,
  generations,
}: {
  members: FindMemberOption[];
  branches: string[];
  generations: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('');
  const [generation, setGeneration] = useState('');
  const [focused, setFocused] = useState(false);

  function filtered() {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (branch && m.branch !== branch) return false;
      if (generation !== '' && m.generation !== Number(generation)) return false;
      return true;
    });
  }

  const results = focused ? filtered() : [];
  const genOptions = Array.from({ length: Math.max(generations, 1) }, (_, i) => ({
    label: i === 0 ? '1st Generation' : `${i + 1}${i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Generation`,
    value: String(i),
  }));

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lift">
      <h3 className="font-display text-base font-bold text-ink">Find a Family Member</h3>

      <div className="relative mt-3">
        <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search by name..."
          className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-inkSoft/60 outline-none transition focus:border-navyAccent focus:ring-2 focus:ring-navyAccent/20"
        />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-line/60 bg-white shadow-lift">
            {results.map((m) => (
              <button
                key={m.id}
                onMouseDown={() => router.push(`/tree?focus=${m.id}`)}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition hover:bg-parchment/60"
              >
                <span className="font-semibold text-ink">{m.name}</span>
                {m.years && <span className="text-xs text-inkSoft">{m.years}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-inkSoft outline-none transition focus:border-navyAccent"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={generation}
          onChange={(e) => setGeneration(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-inkSoft outline-none transition focus:border-navyAccent"
        >
          <option value="">All Generations</option>
          {genOptions.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {
          const r = filtered();
          if (r.length > 0) router.push(`/tree?focus=${r[0].id}`);
        }}
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-navyAccent px-4 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-navyAccent/90',
        )}
      >
        <Icon name="search" className="h-4 w-4" />
        Search
      </button>
    </div>
  );
}