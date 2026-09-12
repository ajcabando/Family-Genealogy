'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';

const sections = [
  {
    icon: 'home',
    title: 'Getting Started',
    desc: 'Sign in, install the app on your phone, and update your information.',
    articles: 4,
    href: '/login',
    linkLabel: 'Sign in',
  },
  {
    icon: 'tree',
    title: 'Using the Family Tree',
    desc: 'Navigate generations, search members, and use focus mode.',
    articles: 6,
    href: '/tree',
    linkLabel: 'Open the tree',
  },
  {
    icon: 'calendar',
    title: 'Reunions',
    desc: 'Create and manage events, albums, and reunion memories.',
    articles: 4,
    href: '/reunions',
    linkLabel: 'View reunions',
  },
  {
    icon: 'user',
    title: 'Managing Your Profile',
    desc: 'Edit profile details and keep your information up to date.',
    articles: 4,
    href: '/profile',
    linkLabel: 'Open profile',
  },
  {
    icon: 'camera',
    title: 'Uploading Photos',
    desc: 'Share family memories — take photos, tag members, add captions.',
    articles: 4,
    href: '/photos',
    linkLabel: 'Upload photos',
  },
  {
    icon: 'inbox',
    title: 'Contributions',
    desc: 'Support changes and track approvals for what you submit.',
    articles: 2,
    href: '/contributions',
    linkLabel: 'My contributions',
  },
  {
    icon: 'bell',
    title: 'Notifications',
    desc: 'Stay up to date when something needs your attention.',
    articles: 3,
    href: '/notifications',
    linkLabel: 'View notifications',
  },
  {
    icon: 'users',
    title: 'Family Directory',
    desc: 'Browse every family member and open full profiles.',
    articles: 4,
    href: '/family',
    linkLabel: 'Browse family',
  },
];

export default function GuidePage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return sections;
    const q = query.toLowerCase();
    return sections.filter((s) => `${s.title} ${s.desc}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Archive Guide</h1>
        <p className="mt-1 text-sm text-inkSoft">
          Quick tips for browsing, contributing, and getting the most out of your family archive.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help topics..."
          className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-sm text-ink placeholder:text-inkSoft/60 outline-none shadow-card transition focus:border-navyAccent focus:ring-2 focus:ring-navyAccent/20"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="search" className="h-8 w-8 text-inkSoft/40" />
          <p className="text-sm text-inkSoft">No help topics match &ldquo;{query}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((s) => (
            <Link key={s.title} href={s.href} className="card group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navyAccent/10 text-navyAccent transition group-hover:bg-navyAccent group-hover:text-white">
                <Icon name={s.icon} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-ink group-hover:text-navyAccent">{s.title}</h3>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{s.articles} articles</span>
                </div>
                <p className="mt-1 text-sm text-inkSoft">{s.desc}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navyAccent">
                  {s.linkLabel} <span aria-hidden="true">&rarr;</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-display text-base font-bold text-ink">Need help?</h3>
        <p className="mt-1.5 text-sm text-inkSoft">
          If something isn&apos;t working or you&apos;re not sure what you&apos;re allowed to do, ask your family&apos;s administrator — they manage accounts, approvals, and settings.
        </p>
      </div>
    </div>
  );
}